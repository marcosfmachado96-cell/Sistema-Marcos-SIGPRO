// Middlewares de autenticação (JWT) e autorização por perfil.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Verifica o token e popula req.usuario = { id, perfil, email }.
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token de autenticação ausente.' });
  }
  try {
    const payload = jwt.verify(token, env.jwt.segredo);
    req.usuario = { id: payload.sub, perfil: payload.perfil, email: payload.email };
    return next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Restringe o acesso a um ou mais perfis.
function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso restrito ao perfil autorizado.' });
    }
    return next();
  };
}

module.exports = { autenticar, exigirPerfil };
