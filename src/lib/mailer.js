// Camada de envio de e-mail — agnóstica de provedor.
// Usa SMTP autenticado (nodemailer) por padrão. Funciona com qualquer provedor
// (Gmail/Workspace via senha de aplicativo, Microsoft 365 via OAuth2/SMTP,
// ou um serviço transacional como Amazon SES/Resend) apenas trocando as
// variáveis de ambiente SMTP_*. Credenciais nunca ficam no código.
//
// Se BREVO_API_KEY estiver definida, o envio usa a API HTTP do Brevo em vez
// de SMTP. Necessário em hospedagens que bloqueiam portas SMTP de saída
// (ex.: plano gratuito do Render) — HTTP/443 não sofre esse bloqueio.
//
// Enquanto nenhum dos dois estiver configurado, as funções apenas registram
// a intenção de envio (modo "dry-run") para não quebrar o fluxo em dev.

const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function obterTransporter() {
  if (transporter) return transporter;
  const { host, porta, usuario, senha } = env.email.smtp;
  if (!host || !usuario || !senha) return null; // SMTP ainda não configurado
  const secure = porta === 465;
  transporter = nodemailer.createTransport({
    host,
    port: porta,
    secure,                 // 465 = SSL direto; 587 = STARTTLS
    requireTLS: !secure,    // força STARTTLS na 587 (recomendado p/ Gmail)
    auth: { user: usuario, pass: senha },
  });
  return transporter;
}

// Verifica a conexão/credenciais SMTP. Útil para diagnosticar a configuração.
async function verificar() {
  if (env.email.brevoApiKey) return { configurado: true, ok: true, modo: 'brevo-api' };
  const t = obterTransporter();
  if (!t) return { configurado: false };
  await t.verify();
  return { configurado: true, ok: true, modo: 'smtp' };
}

// Envio via API HTTP do Brevo (porta 443) — usado quando SMTP de saída está bloqueado.
async function enviarViaBrevoApi({ para, assunto, html, remetente }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.email.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: remetente },
      to: [{ email: para }],
      ...(env.email.replyTo ? { replyTo: { email: env.email.replyTo } } : {}),
      subject: assunto,
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    const e = new Error(`Falha ao enviar e-mail via Brevo (${resp.status}): ${t.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }
  return resp.json();
}

async function enviar({ para, assunto, html, anexos }) {
  const remetente = env.email.remetente || env.email.smtp.usuario;

  if (env.email.brevoApiKey) {
    return enviarViaBrevoApi({ para, assunto, html, remetente });
  }

  const t = obterTransporter();
  if (!t) {
    console.warn(`[e-mail:dry-run] Para: ${para} | Assunto: ${assunto} (e-mail não configurado)`);
    return { dryRun: true };
  }
  return t.sendMail({
    from: remetente,
    replyTo: env.email.replyTo || undefined,
    to: para,
    subject: assunto,
    html,
    attachments: anexos || [],
  });
}

module.exports = { enviar, verificar };
