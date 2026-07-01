// Serviço de autenticação: login com e-mail/senha e emissão de JWT.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');

async function login({ email, senha }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // Mensagem genérica para não revelar existência de conta.
  const credenciaisInvalidas = () => {
    const e = new Error('Credenciais inválidas.');
    e.status = 401;
    return e;
  };

  if (!usuario || !usuario.ativo || !usuario.senhaHash) throw credenciaisInvalidas();

  const ok = await bcrypt.compare(senha, usuario.senhaHash);
  if (!ok) throw credenciaisInvalidas();

  const token = jwt.sign(
    { perfil: usuario.perfil, email: usuario.email },
    env.jwt.segredo,
    { subject: usuario.id, expiresIn: env.jwt.expiraEm }
  );

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
  };
}

module.exports = { login };
