// Serviço de autenticação: login com e-mail/senha, emissão de JWT e
// recuperação de senha (link único por e-mail, mesmo padrão do convite).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const mailer = require('../lib/mailer');

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

// Solicita a redefinição de senha. Sempre responde com sucesso genérico
// (não revela se o e-mail existe); o envio real só ocorre se o usuário existir.
async function solicitarRedefinicao(email) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || !usuario.senhaHash) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + env.redefinicaoSenha.validadeHoras * 3600 * 1000);

  await prisma.redefinicaoSenha.create({
    data: { usuarioId: usuario.id, token, expiraEm },
  });

  const link = `${env.app.urlBase}/redefinir-senha?token=${token}`;
  await mailer.enviar({
    para: usuario.email,
    assunto: 'Redefinição de senha — Sistema de Medições (CO 036/2022 DOP)',
    html: `<p>Recebemos uma solicitação para redefinir sua senha.</p>
           <p>Defina uma nova senha em: <a href="${link}">${link}</a></p>
           <p>O link expira em ${env.redefinicaoSenha.validadeHoras} hora(s). Se você não fez essa
           solicitação, ignore este e-mail.</p>`,
  });
}

// Confirma a redefinição: valida o token e define a nova senha.
async function redefinirSenha({ token, novaSenha }) {
  const tokenInvalido = () => {
    const e = new Error('Link de redefinição inválido, expirado ou já utilizado.');
    e.status = 400;
    return e;
  };

  const pedido = await prisma.redefinicaoSenha.findUnique({ where: { token } });
  if (!pedido || pedido.usadoEm || pedido.expiraEm < new Date()) throw tokenInvalido();

  const senhaHash = await bcrypt.hash(novaSenha, 12);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: pedido.usuarioId }, data: { senhaHash } }),
    prisma.redefinicaoSenha.update({ where: { id: pedido.id }, data: { usadoEm: new Date() } }),
  ]);
}

module.exports = { login, solicitarRedefinicao, redefinirSenha };
