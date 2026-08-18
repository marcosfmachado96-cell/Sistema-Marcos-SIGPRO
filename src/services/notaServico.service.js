// Mapa Operacional: notas de serviço por rodovia/km, com histórico livre de
// eventos (mobilização, desmobilização, ocorrência, paralisação, retomada,
// andamento). Função à parte do fluxo de medições: qualquer perfil
// autenticado cadastra e mantém as próprias notas.
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const storage = require('../lib/storage');
const malha = require('../lib/malha');

function limparNome(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const TIPOS_EVENTO = ['MOBILIZACAO', 'DESMOBILIZACAO', 'OCORRENCIA', 'PARALISACAO', 'RETOMADA', 'ANDAMENTO'];

async function obterNota(id) {
  const n = await prisma.notaServico.findUnique({ where: { id } });
  if (!n || n.excluidoEm) {
    const e = new Error('Nota de serviço não encontrada.'); e.status = 404; throw e;
  }
  return n;
}

function exigirAutor(nota, ator) {
  if (nota.autorId !== ator.id) {
    const e = new Error('Apenas o autor pode alterar esta nota de serviço.'); e.status = 403; throw e;
  }
}

async function criar(dados, ator) {
  const { numero, contrato, descricao } = dados;
  if (!numero?.trim() || !contrato?.trim() || !descricao?.trim()) {
    const e = new Error('Informe número, contrato e descrição.'); e.status = 400; throw e;
  }
  const rodovia = Number(dados.rodovia);
  const kmInicial = Number(dados.kmInicial);
  const kmFinal = Number(dados.kmFinal);
  if (!Number.isFinite(rodovia) || !Number.isFinite(kmInicial) || !Number.isFinite(kmFinal)) {
    const e = new Error('Informe rodovia e quilometragem válidas.'); e.status = 400; throw e;
  }

  const ponto = malha.localizarPonto(rodovia, kmInicial);
  if (!ponto) {
    const e = new Error(`Não encontrei o km ${kmInicial} na rodovia PR-${rodovia} na malha rodoviária. Confira os valores.`);
    e.status = 400;
    throw e;
  }

  return prisma.notaServico.create({
    data: {
      numero: numero.trim(), contrato: contrato.trim(), descricao: descricao.trim(),
      rodovia, kmInicial, kmFinal,
      latitude: ponto.lat, longitude: ponto.lng,
      autorId: ator.id,
    },
  });
}

// Visível a todos — o mapa operacional é uma visão compartilhada da equipe.
// Inclui só o evento mais recente (o suficiente para colorir o marcador no mapa
// e mostrar o status atual sem trazer o histórico inteiro de cada nota).
async function listar() {
  return prisma.notaServico.findMany({
    where: { excluidoEm: null },
    orderBy: { criadoEm: 'desc' },
    include: {
      autor: { select: { nome: true, contratada: true } },
      eventos: { orderBy: { data: 'desc' }, take: 1 },
    },
  });
}

async function detalhar(id) {
  const nota = await prisma.notaServico.findUnique({
    where: { id },
    include: {
      autor: { select: { nome: true, contratada: true } },
      eventos: {
        orderBy: { data: 'desc' },
        include: { autor: { select: { nome: true } }, anexos: true },
      },
    },
  });
  if (!nota || nota.excluidoEm) {
    const e = new Error('Nota de serviço não encontrada.'); e.status = 404; throw e;
  }
  return nota;
}

async function atualizar(id, dados, ator) {
  const nota = await obterNota(id);
  exigirAutor(nota, ator);

  const data = {};
  if (dados.numero != null) data.numero = dados.numero.trim();
  if (dados.contrato != null) data.contrato = dados.contrato.trim();
  if (dados.descricao != null) data.descricao = dados.descricao.trim();

  // Se rodovia/km mudar, recalcula o ponto no mapa.
  const rodovia = dados.rodovia != null ? Number(dados.rodovia) : nota.rodovia;
  const kmInicial = dados.kmInicial != null ? Number(dados.kmInicial) : Number(nota.kmInicial);
  const kmFinal = dados.kmFinal != null ? Number(dados.kmFinal) : Number(nota.kmFinal);
  if (dados.rodovia != null || dados.kmInicial != null) {
    const ponto = malha.localizarPonto(rodovia, kmInicial);
    if (!ponto) {
      const e = new Error(`Não encontrei o km ${kmInicial} na rodovia PR-${rodovia} na malha rodoviária.`);
      e.status = 400;
      throw e;
    }
    data.latitude = ponto.lat;
    data.longitude = ponto.lng;
  }
  data.rodovia = rodovia;
  data.kmInicial = kmInicial;
  data.kmFinal = kmFinal;

  return prisma.notaServico.update({ where: { id }, data });
}

async function excluir(id, ator) {
  const nota = await obterNota(id);
  exigirAutor(nota, ator);
  return prisma.notaServico.update({
    where: { id }, data: { excluidoEm: new Date(), excluidoPorId: ator.id },
  });
}

async function adicionarEvento(id, dados, ator) {
  const nota = await obterNota(id);
  exigirAutor(nota, ator);

  if (!TIPOS_EVENTO.includes(dados.tipo)) {
    const e = new Error('Tipo de evento inválido.'); e.status = 400; throw e;
  }
  const data = dados.data ? new Date(dados.data) : new Date();

  return prisma.eventoNotaServico.create({
    data: { notaServicoId: id, tipo: dados.tipo, data, texto: dados.texto?.trim() || null, autorId: ator.id },
    include: { autor: { select: { nome: true } }, anexos: true },
  });
}

async function anexarEvento(eventoId, arquivos, ator) {
  if (!arquivos || arquivos.length === 0) {
    const e = new Error('Nenhum arquivo enviado.'); e.status = 400; throw e;
  }
  const evento = await prisma.eventoNotaServico.findUnique({ where: { id: eventoId } });
  if (!evento) { const e = new Error('Evento não encontrado.'); e.status = 404; throw e; }
  const nota = await obterNota(evento.notaServicoId);
  exigirAutor(nota, ator);

  const criados = [];
  for (const f of arquivos) {
    const nomeLimpo = limparNome(f.originalname).slice(0, 120) || 'arquivo';
    const chave = `mapa-operacional/${nota.id}/${eventoId}/${crypto.randomBytes(8).toString('hex')}-${nomeLimpo}`;
    await storage.enviarObjeto({ chave, buffer: f.buffer, contentType: f.mimetype });
    criados.push(await prisma.anexoEventoNota.create({
      data: {
        eventoId, nomeArquivo: f.originalname, chaveS3: chave,
        tamanho: f.size, contentType: f.mimetype, enviadoPorId: ator.id,
      },
    }));
  }
  return criados;
}

async function prepararDownload(anexoId) {
  const anexo = await prisma.anexoEventoNota.findUnique({ where: { id: anexoId } });
  if (!anexo) { const e = new Error('Anexo não encontrado.'); e.status = 404; throw e; }
  const stream = await storage.obterStream(anexo.chaveS3);
  return { stream, nomeArquivo: anexo.nomeArquivo, contentType: anexo.contentType };
}

function rodoviasDisponiveis() {
  return malha.listarRodovias();
}

module.exports = {
  criar, listar, detalhar, atualizar, excluir,
  adicionarEvento, anexarEvento, prepararDownload,
  rodoviasDisponiveis,
};
