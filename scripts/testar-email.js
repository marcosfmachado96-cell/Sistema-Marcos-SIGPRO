// Testa a configuração de e-mail (SMTP). Verifica a conexão e, se um
// destinatário for informado, envia uma mensagem de teste.
//
// Uso:
//   node scripts/testar-email.js                 (apenas verifica a conexão)
//   node scripts/testar-email.js voce@exemplo.com (envia um teste)
const mailer = require('../src/lib/mailer');

async function main() {
  const destino = process.argv[2];

  const v = await mailer.verificar();
  if (!v.configurado) {
    console.log('E-mail não configurado. Preencha SMTP_HOST/SMTP_USER/SMTP_PASS ou BREVO_API_KEY no .env.');
    return;
  }
  console.log(v.modo === 'brevo-api' ? 'API do Brevo configurada com sucesso.' : 'Conexão SMTP verificada com sucesso.');

  if (destino) {
    await mailer.enviar({
      para: destino,
      assunto: 'Teste — Sistema de Medições DER/PR',
      html: '<p>Configuração de e-mail funcionando. Esta é uma mensagem de teste.</p>',
    });
    console.log(`E-mail de teste enviado para ${destino}.`);
  } else {
    console.log('Para enviar um teste, informe um destinatário: node scripts/testar-email.js voce@exemplo.com');
  }
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
