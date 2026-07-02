// Configuração do app Express (com endurecimento de produção).
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const rotas = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Atrás de proxy reverso (Railway/Render/Nginx): IP correto para o rate limit.
if (env.trustProxy) app.set('trust proxy', 1);

// Cabeçalhos de segurança. CSP desligada por padrão para não quebrar o SPA e as
// fontes externas; configure uma política própria ao endurecer ainda mais.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS apenas quando o frontend é servido de outra origem.
if (env.corsOrigin.length > 0) {
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
}

app.use(express.json());

// Limite de tentativas nos endpoints sensíveis (login e aceite de convite).
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});
app.use('/api/auth/login', limiteAuth);
app.use('/api/auth/esqueci-senha', limiteAuth);
app.use('/api/auth/redefinir-senha', limiteAuth);
app.use('/api/convites/aceitar', limiteAuth);

app.get('/saude', (req, res) => res.json({ ok: true, servico: 'medicao-der-pr' }));
app.use('/api', rotas);

// Serviço opcional do build do frontend (deploy de serviço único).
if (env.frontend.servir) {
  app.use(express.static(env.frontend.dist));
  // Fallback do SPA: rotas que não são /api caem no index.html.
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(env.frontend.dist, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
