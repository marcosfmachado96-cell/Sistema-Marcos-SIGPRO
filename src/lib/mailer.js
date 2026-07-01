// Camada de envio de e-mail — agnóstica de provedor.
// Usa SMTP autenticado (nodemailer). Funciona com qualquer provedor
// (Gmail/Workspace via senha de aplicativo, Microsoft 365 via OAuth2/SMTP,
// ou um serviço transacional como Amazon SES/Resend) apenas trocando as
// variáveis de ambiente SMTP_*. Credenciais nunca ficam no código.
//
// Uso real entra na Etapa 6. Enquanto o SMTP não estiver configurado,
// as funções apenas registram a intenção de envio (modo "dry-run") para
// não quebrar o fluxo durante o desenvolvimento.

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
  const t = obterTransporter();
  if (!t) return { configurado: false };
  await t.verify();
  return { configurado: true, ok: true };
}

async function enviar({ para, assunto, html, anexos }) {
  const t = obterTransporter();
  const remetente = env.email.remetente || env.email.smtp.usuario;
  if (!t) {
    console.warn(`[e-mail:dry-run] Para: ${para} | Assunto: ${assunto} (SMTP não configurado)`);
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
