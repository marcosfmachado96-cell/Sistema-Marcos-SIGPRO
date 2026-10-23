// Equipe de administração local por contrato. Visão compartilhada: qualquer
// usuário autenticado cadastra contratos; só o autor (ou o coordenador) edita.
// O objetivo é detectar o mesmo profissional indicado em contratos cujos
// períodos (já considerando as alterações de prazo) se sobrepõem.
const prisma = require('../lib/prisma');

const AREAS = ['AREA_01', 'AREA_02', 'AREA_03', 'AREA_04', 'AREA_05', 'SR_LESTE'];
const DIA = 24 * 60 * 60 * 1000;

function erro(msg, status = 400) {
  const e = new Error(msg); e.status = status; return e;
}

function normalizarNome(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseData(valor, rotulo) {
  const d = valor ? new Date(valor) : null;
  if (!d || isNaN(d)) throw erro(`Informe uma ${rotulo} válida.`);
  return d;
}

function parsePercentual(valor) {
  const n = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 100) throw erro('O percentual mensal deve ser maior que 0 e no máximo 100.');
  return Math.round(n * 100) / 100;
}

function validarMembro(dados) {
  const nome = String(dados.nome || '').trim().replace(/\s+/g, ' ');
  const cargo = String(dados.cargo || '').trim();
  if (nome.split(' ').length < 2) throw erro('Informe o nome completo do profissional.');
  if (!cargo) throw erro('Informe o cargo.');
  return { nome, nomeNormalizado: normalizarNome(nome), cargo, percentual: parsePercentual(dados.percentual) };
}

// Término vigente = o da alteração de prazo mais recente (ou o original).
function fimVigente(contrato) {
  const ultima = [...(contrato.alteracoes || [])].sort((a, b) => b.criadoEm - a.criadoEm)[0];
  return ultima ? ultima.dataFim : contrato.dataFim;
}

async function obterContrato(id) {
  const c = await prisma.contratoEquipe.findUnique({ where: { id } });
  if (!c || c.excluidoEm) throw erro('Contrato não encontrado.', 404);
  return c;
}

function exigirPermissao(contrato, ator) {
  if (contrato.autorId !== ator.id && ator.perfil !== 'COORDENADOR') {
    throw erro('Apenas o autor do cadastro ou o coordenador pode alterar este contrato.', 403);
  }
}

async function exigirNumeroLivre(numero, ignorarId) {
  const existente = await prisma.contratoEquipe.findFirst({
    where: { numero, excluidoEm: null, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
  });
  if (existente) throw erro(`O contrato ${numero} já está cadastrado.`, 409);
}

// ---------------------------------------------------------------------------
// Sobreposição
// ---------------------------------------------------------------------------

// Trechos de tempo em que a pessoa consta em 2+ contratos ao mesmo tempo,
// com a soma dos percentuais previstos em cada trecho.
function trechosSobrepostos(entradas) {
  const pontos = new Set();
  for (const e of entradas) { pontos.add(e.inicio.getTime()); pontos.add(e.fim.getTime() + DIA); }
  const ord = [...pontos].sort((a, b) => a - b);

  const trechos = [];
  for (let i = 0; i < ord.length - 1; i++) {
    const ini = ord[i];
    const fimExcl = ord[i + 1];
    const ativas = entradas.filter((e) => e.inicio.getTime() <= ini && e.fim.getTime() + DIA >= fimExcl);
    if (new Set(ativas.map((a) => a.contratoId)).size < 2) continue;
    const chave = ativas.map((a) => a.membroId).sort().join('|');
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && ultimo.chave === chave && ultimo.fim.getTime() + DIA === ini) {
      ultimo.fim = new Date(fimExcl - DIA);
    } else {
      trechos.push({
        chave, inicio: new Date(ini), fim: new Date(fimExcl - DIA), ativas,
        total: Math.round(ativas.reduce((s, a) => s + a.percentual, 0) * 100) / 100,
      });
    }
  }
  return trechos.map(({ chave, ativas, ...t }) => ({
    ...t,
    excede: t.total > 100,
    contratos: ativas.map((a) => ({ contratoId: a.contratoId, numero: a.numero, area: a.area, percentual: a.percentual })),
  }));
}

function analisar(contratos) {
  const porPessoa = new Map();
  for (const c of contratos) {
    const inicio = c.dataInicio;
    const fim = fimVigente(c);
    for (const m of c.membros) {
      if (!porPessoa.has(m.nomeNormalizado)) porPessoa.set(m.nomeNormalizado, []);
      porPessoa.get(m.nomeNormalizado).push({
        contratoId: c.id, numero: c.numero, area: c.area, membroId: m.id,
        nome: m.nome, cargo: m.cargo, percentual: Number(m.percentual), inicio, fim,
      });
    }
  }

  const pessoas = [];
  const conflitosPorMembro = new Map(); // membroId -> trechos em que ele está envolvido
  for (const entradas of porPessoa.values()) {
    const trechos = trechosSobrepostos(entradas);
    if (trechos.length === 0) continue;
    pessoas.push({
      nome: entradas[0].nome,
      excede: trechos.some((t) => t.excede),
      maiorTotal: Math.max(...trechos.map((t) => t.total)),
      contratos: entradas.map((e) => ({
        contratoId: e.contratoId, numero: e.numero, area: e.area, cargo: e.cargo,
        percentual: e.percentual, inicio: e.inicio, fim: e.fim,
      })),
      trechos,
    });
    for (const e of entradas) {
      const meus = trechos.filter((t) => t.contratos.some((c) => c.contratoId === e.contratoId));
      if (meus.length) conflitosPorMembro.set(e.membroId, meus);
    }
  }
  pessoas.sort((a, b) => Number(b.excede) - Number(a.excede) || a.nome.localeCompare(b.nome));
  return { pessoas, conflitosPorMembro };
}

async function carregarTodos() {
  return prisma.contratoEquipe.findMany({
    where: { excluidoEm: null },
    include: { membros: true, alteracoes: true, autor: { select: { nome: true, contratada: true } } },
    orderBy: { numero: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

async function criar(dados, ator) {
  const numero = String(dados.numero || '').trim();
  const descricao = String(dados.descricao || '').trim();
  if (!numero || !descricao) throw erro('Informe o número do contrato e a descrição.');
  if (!AREAS.includes(dados.area)) throw erro('Informe a área de gestão.');
  const dataInicio = parseData(dados.dataInicio, 'data de início');
  const dataFim = parseData(dados.dataFim, 'data de fim');
  if (dataFim < dataInicio) throw erro('A data de fim não pode ser anterior à data de início.');
  await exigirNumeroLivre(numero);

  return prisma.contratoEquipe.create({
    data: { numero, descricao, area: dados.area, dataInicio, dataFim, autorId: ator.id },
  });
}

async function listar() {
  const contratos = await carregarTodos();
  const { conflitosPorMembro } = analisar(contratos);
  return contratos.map((c) => ({
    id: c.id, numero: c.numero, descricao: c.descricao, area: c.area,
    dataInicio: c.dataInicio, dataFim: c.dataFim, dataFimVigente: fimVigente(c),
    prorrogado: c.alteracoes.length > 0,
    autor: c.autor, autorId: c.autorId,
    totalMembros: c.membros.length,
    membrosComSobreposicao: c.membros.filter((m) => conflitosPorMembro.has(m.id)).length,
  }));
}

async function sobreposicoes() {
  const { pessoas } = analisar(await carregarTodos());
  return pessoas;
}

async function detalhar(id) {
  await obterContrato(id);
  const contratos = await carregarTodos();
  const c = contratos.find((x) => x.id === id);
  const { conflitosPorMembro } = analisar(contratos);
  return {
    id: c.id, numero: c.numero, descricao: c.descricao, area: c.area,
    dataInicio: c.dataInicio, dataFim: c.dataFim, dataFimVigente: fimVigente(c),
    autor: c.autor, autorId: c.autorId, criadoEm: c.criadoEm,
    membros: [...c.membros].sort((a, b) => a.nome.localeCompare(b.nome)).map((m) => ({
      id: m.id, nome: m.nome, cargo: m.cargo, percentual: Number(m.percentual),
      sobreposicoes: conflitosPorMembro.get(m.id) || [],
    })),
    alteracoes: [...c.alteracoes].sort((a, b) => b.criadoEm - a.criadoEm),
  };
}

async function atualizar(id, dados, ator) {
  const c = await obterContrato(id);
  exigirPermissao(c, ator);
  const data = {};
  if (dados.numero != null) {
    const numero = String(dados.numero).trim();
    if (!numero) throw erro('Informe o número do contrato.');
    await exigirNumeroLivre(numero, id);
    data.numero = numero;
  }
  if (dados.descricao != null) {
    if (!String(dados.descricao).trim()) throw erro('Informe a descrição.');
    data.descricao = String(dados.descricao).trim();
  }
  if (dados.area != null) {
    if (!AREAS.includes(dados.area)) throw erro('Área de gestão inválida.');
    data.area = dados.area;
  }
  if (dados.dataInicio != null) data.dataInicio = parseData(dados.dataInicio, 'data de início');
  if (dados.dataFim != null) data.dataFim = parseData(dados.dataFim, 'data de fim');
  if ((data.dataFim || c.dataFim) < (data.dataInicio || c.dataInicio)) {
    throw erro('A data de fim não pode ser anterior à data de início.');
  }
  return prisma.contratoEquipe.update({ where: { id }, data });
}

async function excluir(id, ator) {
  const c = await obterContrato(id);
  exigirPermissao(c, ator);
  return prisma.contratoEquipe.update({ where: { id }, data: { excluidoEm: new Date() } });
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------

async function adicionarMembro(contratoId, dados, ator) {
  const c = await obterContrato(contratoId);
  exigirPermissao(c, ator);
  const m = validarMembro(dados);
  const repetido = await prisma.membroEquipe.findFirst({ where: { contratoId, nomeNormalizado: m.nomeNormalizado } });
  if (repetido) throw erro('Este profissional já consta na equipe deste contrato.', 409);
  return prisma.membroEquipe.create({ data: { contratoId, ...m } });
}

async function obterMembro(membroId) {
  const m = await prisma.membroEquipe.findUnique({ where: { id: membroId }, include: { contrato: true } });
  if (!m || m.contrato.excluidoEm) throw erro('Profissional não encontrado.', 404);
  return m;
}

async function atualizarMembro(membroId, dados, ator) {
  const atual = await obterMembro(membroId);
  exigirPermissao(atual.contrato, ator);
  const m = validarMembro({ nome: dados.nome ?? atual.nome, cargo: dados.cargo ?? atual.cargo, percentual: dados.percentual ?? atual.percentual });
  const repetido = await prisma.membroEquipe.findFirst({
    where: { contratoId: atual.contratoId, nomeNormalizado: m.nomeNormalizado, id: { not: membroId } },
  });
  if (repetido) throw erro('Este profissional já consta na equipe deste contrato.', 409);
  return prisma.membroEquipe.update({ where: { id: membroId }, data: m });
}

async function removerMembro(membroId, ator) {
  const atual = await obterMembro(membroId);
  exigirPermissao(atual.contrato, ator);
  await prisma.membroEquipe.delete({ where: { id: membroId } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Alterações de prazo
// ---------------------------------------------------------------------------

async function adicionarAlteracao(contratoId, dados, ator) {
  const c = await obterContrato(contratoId);
  exigirPermissao(c, ator);
  const dataFim = parseData(dados.dataFim, 'nova data de término');
  if (dataFim < c.dataInicio) throw erro('O novo término não pode ser anterior ao início do contrato.');
  return prisma.alteracaoPrazoContrato.create({
    data: {
      contratoId, dataFim, autorId: ator.id,
      instrumento: dados.instrumento?.trim() || null,
      observacao: dados.observacao?.trim() || null,
    },
  });
}

async function removerAlteracao(alteracaoId, ator) {
  const a = await prisma.alteracaoPrazoContrato.findUnique({ where: { id: alteracaoId }, include: { contrato: true } });
  if (!a || a.contrato.excluidoEm) throw erro('Alteração não encontrada.', 404);
  exigirPermissao(a.contrato, ator);
  await prisma.alteracaoPrazoContrato.delete({ where: { id: alteracaoId } });
  return { ok: true };
}

module.exports = {
  AREAS, criar, listar, detalhar, atualizar, excluir, sobreposicoes,
  adicionarMembro, atualizarMembro, removerMembro,
  adicionarAlteracao, removerAlteracao,
  _interno: { trechosSobrepostos, analisar, normalizarNome, fimVigente },
};
