// Projetos de dosagem e caracterização de material para revestimento primário.
// Cadastro simples (sem máquina de estados): o colaborador registra e mantém
// os próprios projetos; o coordenador só acompanha, sem editar.
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const storage = require('../lib/storage');

function limparNome(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function normalizarRodovias(rodovias) {
  if (!Array.isArray(rodovias)) return [];
  return rodovias.map((r) => String(r).trim()).filter(Boolean);
}

async function obterProjeto(id) {
  const p = await prisma.projetoDosagem.findUnique({ where: { id } });
  if (!p || p.excluidoEm) {
    const e = new Error('Projeto de dosagem não encontrado.');
    e.status = 404;
    throw e;
  }
  return p;
}

// Colaborador só acessa os próprios; coordenador acessa todos (leitura).
function autorizarAcesso(projeto, ator) {
  if (ator.perfil === 'COORDENADOR') return;
  if (projeto.autorId !== ator.id) {
    const e = new Error('Acesso negado a este projeto de dosagem.');
    e.status = 403;
    throw e;
  }
}

function exigirAutor(projeto, ator) {
  if (ator.perfil !== 'USUARIO' || projeto.autorId !== ator.id) {
    const e = new Error('Apenas o autor pode alterar este projeto de dosagem.');
    e.status = 403;
    throw e;
  }
}

async function criar(dados, ator) {
  if (ator.perfil !== 'USUARIO') {
    const e = new Error('Apenas colaboradores cadastram projetos de dosagem.');
    e.status = 403;
    throw e;
  }
  const { descricao, contrato } = dados;
  if (!descricao || !descricao.trim() || !contrato || !contrato.trim()) {
    const e = new Error('Informe descrição e contrato.');
    e.status = 400;
    throw e;
  }
  const rodovias = normalizarRodovias(dados.rodovias);
  if (rodovias.length === 0) {
    const e = new Error('Informe ao menos uma rodovia.');
    e.status = 400;
    throw e;
  }
  return prisma.projetoDosagem.create({
    data: { descricao: descricao.trim(), contrato: contrato.trim(), rodovias, autorId: ator.id },
  });
}

async function listar(ator) {
  const where = { excluidoEm: null };
  if (ator.perfil !== 'COORDENADOR') where.autorId = ator.id;
  return prisma.projetoDosagem.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    include: { autor: { select: { nome: true, contratada: true } } },
  });
}

async function detalhar(id, ator) {
  const projeto = await prisma.projetoDosagem.findUnique({
    where: { id },
    include: { autor: { select: { nome: true, contratada: true } }, anexos: true },
  });
  if (!projeto || projeto.excluidoEm) {
    const e = new Error('Projeto de dosagem não encontrado.');
    e.status = 404;
    throw e;
  }
  autorizarAcesso(projeto, ator);
  return projeto;
}

async function atualizar(id, dados, ator) {
  const projeto = await obterProjeto(id);
  exigirAutor(projeto, ator);

  const data = {};
  if (dados.descricao != null) {
    if (!dados.descricao.trim()) { const e = new Error('Descrição não pode ficar vazia.'); e.status = 400; throw e; }
    data.descricao = dados.descricao.trim();
  }
  if (dados.contrato != null) {
    if (!dados.contrato.trim()) { const e = new Error('Contrato não pode ficar vazio.'); e.status = 400; throw e; }
    data.contrato = dados.contrato.trim();
  }
  if (dados.rodovias != null) {
    const rodovias = normalizarRodovias(dados.rodovias);
    if (rodovias.length === 0) { const e = new Error('Informe ao menos uma rodovia.'); e.status = 400; throw e; }
    data.rodovias = rodovias;
  }

  return prisma.projetoDosagem.update({ where: { id }, data });
}

async function excluir(id, ator) {
  const projeto = await obterProjeto(id);
  exigirAutor(projeto, ator);
  return prisma.projetoDosagem.update({
    where: { id },
    data: { excluidoEm: new Date(), excluidoPorId: ator.id },
  });
}

async function anexar(id, arquivos, ator) {
  if (!arquivos || arquivos.length === 0) {
    const e = new Error('Nenhum arquivo enviado.'); e.status = 400; throw e;
  }
  const projeto = await obterProjeto(id);
  exigirAutor(projeto, ator);

  const criados = [];
  for (const f of arquivos) {
    const nomeLimpo = limparNome(f.originalname).slice(0, 120) || 'arquivo';
    const chave = `dosagem/${id}/${crypto.randomBytes(8).toString('hex')}-${nomeLimpo}`;
    await storage.enviarObjeto({ chave, buffer: f.buffer, contentType: f.mimetype });
    criados.push(await prisma.anexoDosagem.create({
      data: {
        projetoDosagemId: id,
        nomeArquivo: f.originalname,
        chaveS3: chave,
        tamanho: f.size,
        contentType: f.mimetype,
        enviadoPorId: ator.id,
      },
    }));
  }
  return criados;
}

async function prepararDownload(anexoId, ator) {
  const anexo = await prisma.anexoDosagem.findUnique({
    where: { id: anexoId },
    include: { projetoDosagem: true },
  });
  if (!anexo) { const e = new Error('Anexo não encontrado.'); e.status = 404; throw e; }
  autorizarAcesso(anexo.projetoDosagem, ator);
  const stream = await storage.obterStream(anexo.chaveS3);
  return { stream, nomeArquivo: anexo.nomeArquivo, contentType: anexo.contentType };
}

module.exports = { criar, listar, detalhar, atualizar, excluir, anexar, prepararDownload };
