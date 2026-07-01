// Solicitações gerais: colaborador abre; coordenador responde e muda o status.
const prisma = require('../lib/prisma');

async function criar(dados, ator) {
  const { titulo, descricao } = dados;
  if (!titulo || !titulo.trim() || !descricao || !descricao.trim()) {
    const e = new Error('Informe título e descrição.'); e.status = 400; throw e;
  }
  return prisma.solicitacao.create({
    data: { autorId: ator.id, titulo: titulo.trim(), descricao: descricao.trim() },
    include: { autor: { select: { nome: true } } },
  });
}

async function listar(ator) {
  const where = ator.perfil === 'COORDENADOR' ? {} : { autorId: ator.id };
  return prisma.solicitacao.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    include: {
      autor: { select: { nome: true } },
      respondidoPor: { select: { nome: true } },
    },
  });
}

async function responder(id, dados, ator) {
  if (ator.perfil !== 'COORDENADOR') { const e = new Error('Apenas o coordenador responde.'); e.status = 403; throw e; }
  const status = ['ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA'].includes(dados.status) ? dados.status : undefined;
  const solic = await prisma.solicitacao.findUnique({ where: { id } });
  if (!solic) { const e = new Error('Solicitação não encontrada.'); e.status = 404; throw e; }
  return prisma.solicitacao.update({
    where: { id },
    data: {
      resposta: dados.resposta != null ? dados.resposta : solic.resposta,
      status: status || solic.status,
      respondidoPorId: ator.id,
    },
    include: { autor: { select: { nome: true } }, respondidoPor: { select: { nome: true } } },
  });
}

module.exports = { criar, listar, responder };
