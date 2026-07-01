// Serviço de convites. Não há cadastro público: o acesso só existe por convite.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const audit = require('../lib/audit');
const mailer = require('../lib/mailer');

// Coordenador cria um convite por e-mail.
async function criarConvite({ email, perfil, contratada }, coordenador) {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    const e = new Error('Já existe usuário com este e-mail.');
    e.status = 409;
    throw e;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + env.convite.validadeHoras * 3600 * 1000);

  const convite = await prisma.convite.create({
    data: {
      email,
      token,
      perfil: perfil || 'USUARIO',
      contratada: contratada || null,
      expiraEm,
      convidadoPorId: coordenador.id,
    },
  });

  await audit.registrar(null, {
    atorId: coordenador.id,
    acao: 'CRIAR_CONVITE',
    detalhe: { email, perfil: convite.perfil },
  });

  const link = `${env.app.urlBase}/aceite-convite?token=${token}`;
  await mailer.enviar({
    para: email,
    assunto: 'Convite — Sistema de Medições (CO 036/2022 DOP)',
    html: `<p>Você foi convidado a acessar o sistema de gestão de medições.</p>
           <p>Defina sua senha e ative o acesso em: <a href="${link}">${link}</a></p>
           <p>O convite expira em ${env.convite.validadeHoras} horas.</p>`,
  });

  return { id: convite.id, email: convite.email, expiraEm: convite.expiraEm };
}

// Valida um token de convite (consulta na tela de aceite).
async function validarToken(token) {
  const convite = await prisma.convite.findUnique({ where: { token } });
  if (!convite || convite.status !== 'PENDENTE' || convite.expiraEm < new Date()) {
    const e = new Error('Convite inválido, expirado ou já utilizado.');
    e.status = 400;
    throw e;
  }
  return { email: convite.email, perfil: convite.perfil };
}

// Aceite do convite: cria o usuário e define a senha no primeiro acesso.
async function aceitarConvite({ token, nome, senha }) {
  const convite = await prisma.convite.findUnique({ where: { token } });
  if (!convite || convite.status !== 'PENDENTE' || convite.expiraEm < new Date()) {
    const e = new Error('Convite inválido, expirado ou já utilizado.');
    e.status = 400;
    throw e;
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        nome,
        email: convite.email,
        senhaHash,
        perfil: convite.perfil,
        contratada: convite.contratada,
      },
    });
    await tx.convite.update({ where: { id: convite.id }, data: { status: 'ACEITO' } });
    await audit.registrar(tx, { atorId: u.id, acao: 'ACEITAR_CONVITE' });
    return u;
  });

  return { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
}

async function listarConvites() {
  return prisma.convite.findMany({ orderBy: { criadoEm: 'desc' } });
}

module.exports = { criarConvite, validarToken, aceitarConvite, listarConvites };
