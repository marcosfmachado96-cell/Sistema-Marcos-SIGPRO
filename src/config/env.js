// Centraliza a leitura de variáveis de ambiente.
// Nenhum segredo é escrito no código — tudo vem do ambiente.
const path = require('path');
require('dotenv').config();

function obrigatoria(nome) {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  return v;
}

module.exports = {
  porta: parseInt(process.env.PORT || '3000', 10),
  ambiente: process.env.NODE_ENV || 'development',

  // Produção atrás de proxy reverso (Railway/Render/Nginx): habilita a leitura
  // correta do IP do cliente para o rate limit.
  trustProxy: process.env.TRUST_PROXY === 'true',

  // CORS — usado apenas quando o frontend é servido de outra origem.
  // Lista separada por vírgula; vazio = sem CORS (mesma origem).
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),

  // Servir o build do frontend pelo próprio backend (deploy de serviço único).
  frontend: {
    servir: process.env.SERVE_FRONTEND === 'true',
    dist: process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', 'frontend', 'dist'),
  },

  databaseUrl: obrigatoria('DATABASE_URL'),

  jwt: {
    segredo: obrigatoria('JWT_SECRET'),
    expiraEm: process.env.JWT_EXPIRES_IN || '8h',
  },

  convite: {
    // tempo de validade do convite, em horas
    validadeHoras: parseInt(process.env.CONVITE_VALIDADE_HORAS || '72', 10),
  },

  redefinicaoSenha: {
    // tempo de validade do link de redefinição de senha, em horas
    validadeHoras: parseInt(process.env.REDEFINICAO_SENHA_VALIDADE_HORAS || '2', 10),
  },

  app: {
    // URL base do frontend, usada para montar o link de aceite do convite
    urlBase: process.env.APP_URL_BASE || 'http://localhost:5173',
  },

  // Configurado na Etapa 6 (notificações). Lido aqui para validação antecipada.
  email: {
    financeiro: process.env.EMAIL_FINANCEIRO || 'financeiro@simemp.com.br',
    remetente: process.env.EMAIL_REMETENTE || '',
    replyTo: process.env.EMAIL_REPLY_TO || '',
    // Se definida, o envio usa a API HTTP do Brevo em vez de SMTP — necessário
    // em hospedagens que bloqueiam portas SMTP de saída (ex.: Render free tier).
    brevoApiKey: process.env.BREVO_API_KEY || '',
    smtp: {
      host: process.env.SMTP_HOST || '',
      porta: parseInt(process.env.SMTP_PORT || '587', 10),
      usuario: process.env.SMTP_USER || '',
      senha: process.env.SMTP_PASS || '',
    },
  },

  // Armazenamento de anexos (Etapa 4) — S3 ou compatível (R2, MinIO).
  s3: {
    bucket: process.env.S3_BUCKET || '',
    regiao: process.env.S3_REGION || '',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    // Expiração das URLs assinadas (segundos).
    downloadExpiraSegundos: parseInt(process.env.DOWNLOAD_EXPIRA_SEGUNDOS || '300', 10),       // 5 min (uso na tela)
    linkEmailExpiraSegundos: parseInt(process.env.LINK_EMAIL_EXPIRA_SEGUNDOS || '259200', 10), // 3 dias (links no e-mail)
  },

  // Driver de armazenamento. Vazio = automático ('s3' se configurado, senão 'local').
  // 'local' guarda os anexos em disco — útil para testar sem bucket. NÃO use em
  // produção (o disco costuma ser efêmero em hospedagens gerenciadas).
  storage: {
    driver: (process.env.STORAGE_DRIVER || '').toLowerCase(),
    localDir: process.env.STORAGE_LOCAL_DIR || path.join(__dirname, '..', '..', 'uploads_local'),
  },

  upload: {
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
    // Tipos aceitos: PDF e planilhas (xlsx/xls/csv).
    mimesPermitidos: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
  },

  // Análise por IA (Etapa B). Sem chave, opera em modo de simulação.
  ia: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    modelo: process.env.IA_MODELO || 'claude-sonnet-4-6',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  },
};
