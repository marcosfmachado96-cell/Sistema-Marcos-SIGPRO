// Serviço de relatórios de medição.
// Concentra a criação, as transições da máquina de estados, o versionamento
// (preservando versões reprovadas) e a gravação no log de auditoria.

const prisma = require('../lib/prisma');
const audit = require('../lib/audit');
const ia = require('../lib/ia');
const sm = require('../domain/stateMachine');
const { ESTADOS, ACOES, resolverTransicao } = sm;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function obterRelatorio(id) {
  const r = await prisma.relatorio.findUnique({ where: { id } });
  if (!r) {
    const e = new Error('Relatório não encontrado.');
    e.status = 404;
    throw e;
  }
  return r;
}

// Garante que o usuário só acessa os próprios relatórios; coordenador vê tudo.
function autorizarAcesso(relatorio, ator) {
  if (ator.perfil === 'COORDENADOR') return;
  if (relatorio.autorId !== ator.id) {
    const e = new Error('Acesso negado a este relatório.');
    e.status = 403;
    throw e;
  }
}

function snapshotDe(r) {
  return {
    numMedicao: r.numMedicao,
    periodoInicio: r.periodoInicio,
    periodoFim: r.periodoFim,
    contrato: r.contrato,
    objeto: r.objeto,
    valor: r.valor,
  };
}

// ----------------------------------------------------------------------------
// Criação — novo relatório nasce em ENVIADO e segue automaticamente p/ análise
// ----------------------------------------------------------------------------

async function criar(dados, ator) {
  if (ator.perfil !== 'USUARIO') {
    const e = new Error('Apenas usuários convidados cadastram relatórios.');
    e.status = 403;
    throw e;
  }

  const criado = await prisma.$transaction(async (tx) => {
    const relatorio = await tx.relatorio.create({
      data: {
        autorId: ator.id,
        numMedicao: dados.numMedicao,
        periodoInicio: new Date(dados.periodoInicio),
        periodoFim: new Date(dados.periodoFim),
        contrato: dados.contrato,
        objeto: dados.objeto,
        valor: dados.valor,
        estado: ESTADOS.ENVIADO,
        versaoAtual: 1,
      },
    });

    await tx.relatorioVersao.create({
      data: { relatorioId: relatorio.id, numeroVersao: 1, ...snapshotDe(relatorio) },
    });

    await audit.registrar(tx, {
      relatorioId: relatorio.id,
      atorId: ator.id,
      acao: ACOES.CRIAR,
      estadoPara: ESTADOS.ENVIADO,
    });

    // Segue automaticamente para análise do coordenador.
    const atualizado = await tx.relatorio.update({
      where: { id: relatorio.id },
      data: { estado: ESTADOS.EM_ANALISE },
    });
    await audit.registrar(tx, {
      relatorioId: relatorio.id,
      atorId: ator.id,
      acao: ACOES.ENVIAR_PARA_ANALISE,
      estadoDe: ESTADOS.ENVIADO,
      estadoPara: ESTADOS.EM_ANALISE,
    });

    return atualizado;
  });

  return criado;
}

// ----------------------------------------------------------------------------
// Executor genérico de transição (aprovar / reprovar / inserir atesto / etc.)
// ----------------------------------------------------------------------------

async function executarTransicao(id, acao, ator, payload = {}) {
  const relatorio = await obterRelatorio(id);
  autorizarAcesso(relatorio, ator);

  const transicao = resolverTransicao(relatorio.estado, acao, ator.perfil);

  // Guarda: observação obrigatória (reprovação e correção documental).
  if (transicao.exigeObservacao && !(payload.texto && payload.texto.trim())) {
    const e = new Error('Observação é obrigatória nesta ação.');
    e.status = 400;
    throw e;
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    const estadoDe = relatorio.estado;

    // Registra observação, quando aplicável.
    if (transicao.exigeObservacao) {
      const tipo = acao === ACOES.REPROVAR ? 'REPROVACAO_MEDICAO' : 'CORRECAO_DOCUMENTAL';
      await tx.observacao.create({
        data: {
          relatorioId: id,
          autorId: ator.id,
          tipo,
          texto: payload.texto.trim(),
        },
      });
    }

    const r = await tx.relatorio.update({
      where: { id },
      data: { estado: transicao.destino },
    });

    await audit.registrar(tx, {
      relatorioId: id,
      atorId: ator.id,
      acao,
      estadoDe,
      estadoPara: transicao.destino,
      detalhe: payload.detalhe,
    });

    return r;
  });

  return atualizado;
}

// ----------------------------------------------------------------------------
// Reenvio de relatório reprovado — cria nova versão sem sobrescrever a anterior
// ----------------------------------------------------------------------------

async function reenviar(id, dados, ator) {
  const relatorio = await obterRelatorio(id);
  autorizarAcesso(relatorio, ator);
  const transicao = resolverTransicao(relatorio.estado, ACOES.REENVIAR, ator.perfil);

  const atualizado = await prisma.$transaction(async (tx) => {
    const novaVersao = relatorio.versaoAtual + 1;

    const r = await tx.relatorio.update({
      where: { id },
      data: {
        numMedicao: dados.numMedicao ?? relatorio.numMedicao,
        periodoInicio: dados.periodoInicio ? new Date(dados.periodoInicio) : relatorio.periodoInicio,
        periodoFim: dados.periodoFim ? new Date(dados.periodoFim) : relatorio.periodoFim,
        contrato: dados.contrato ?? relatorio.contrato,
        objeto: dados.objeto ?? relatorio.objeto,
        valor: dados.valor ?? relatorio.valor,
        versaoAtual: novaVersao,
        estado: transicao.destino, // EM_ANALISE
      },
    });

    // Nova versão preservando as anteriores (não sobrescreve).
    await tx.relatorioVersao.create({
      data: { relatorioId: id, numeroVersao: novaVersao, ...snapshotDe(r) },
    });

    await audit.registrar(tx, {
      relatorioId: id,
      atorId: ator.id,
      acao: ACOES.REENVIAR,
      estadoDe: relatorio.estado,
      estadoPara: transicao.destino,
      detalhe: { versao: novaVersao },
    });

    return r;
  });

  return atualizado;
}

// ----------------------------------------------------------------------------
// Consultas
// ----------------------------------------------------------------------------

// Usuário vê apenas os próprios; coordenador vê todos, com filtros.
async function listar(ator, filtros = {}) {
  const where = { excluidoEm: null };
  if (ator.perfil !== 'COORDENADOR') {
    where.autorId = ator.id;
  } else {
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.contratada) where.autor = { contratada: filtros.contratada };
    if (filtros.de || filtros.ate) {
      where.periodoInicio = {};
      if (filtros.de) where.periodoInicio.gte = new Date(filtros.de);
      if (filtros.ate) where.periodoInicio.lte = new Date(filtros.ate);
    }
  }
  return prisma.relatorio.findMany({
    where,
    orderBy: { atualizadoEm: 'desc' },
    include: { autor: { select: { nome: true, contratada: true } } },
  });
}

async function detalhar(id, ator) {
  const relatorio = await prisma.relatorio.findUnique({
    where: { id },
    include: {
      autor: { select: { nome: true, contratada: true, email: true } },
      versoes: { orderBy: { numeroVersao: 'asc' } },
      observacoes: { orderBy: [{ numero: 'asc' }] },
      anexos: true,
      atesto: true,
      analises: { orderBy: { criadoEm: 'desc' }, include: { itens: { orderBy: { numero: 'asc' } } } },
    },
  });
  if (!relatorio) {
    const e = new Error('Relatório não encontrado.');
    e.status = 404;
    throw e;
  }
  autorizarAcesso(relatorio, ator);
  relatorio.acoesDisponiveis = sm.acoesDisponiveis(relatorio.estado, ator.perfil);
  return relatorio;
}

async function historico(id, ator) {
  const relatorio = await obterRelatorio(id);
  autorizarAcesso(relatorio, ator);
  return prisma.logAuditoria.findMany({
    where: { relatorioId: id },
    orderBy: { criadoEm: 'asc' },
    include: { ator: { select: { nome: true, perfil: true } } },
  });
}

// ----------------------------------------------------------------------------
// Observações numeradas (coordenador cria; colaborador declara; coordenador confirma)
// ----------------------------------------------------------------------------

async function proximoNumero(tx, relatorioId) {
  const agg = await tx.observacao.aggregate({
    where: { relatorioId }, _max: { numero: true, rodada: true },
  });
  return { numero: (agg._max.numero || 0) + 1, rodadaMax: agg._max.rodada || 0 };
}

// Cria observações numeradas e transiciona (reprovação ou correção documental).
async function criarObservacoesETransicionar(id, itens, ator, acao, tipo) {
  const relatorio = await obterRelatorio(id);
  autorizarAcesso(relatorio, ator);
  const transicao = resolverTransicao(relatorio.estado, acao, ator.perfil);
  const validos = (itens || []).filter((i) => i && i.texto && i.texto.trim());
  if (validos.length === 0) {
    const e = new Error('Informe ao menos uma observação.'); e.status = 400; throw e;
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    let { numero, rodadaMax } = await proximoNumero(tx, id);
    const rodada = rodadaMax + 1;
    for (const it of validos) {
      await tx.observacao.create({
        data: {
          relatorioId: id, autorId: ator.id, tipo,
          origem: it.origem === 'IA' ? 'IA' : 'COORDENADOR',
          numero: numero++, rodada, texto: it.texto.trim(),
        },
      });
    }
    const r = await tx.relatorio.update({ where: { id }, data: { estado: transicao.destino } });
    await audit.registrar(tx, {
      relatorioId: id, atorId: ator.id, acao,
      estadoDe: relatorio.estado, estadoPara: transicao.destino,
      detalhe: { observacoes: validos.length },
    });
    return r;
  });

  return atualizado;
}

function reprovar(id, itens, ator) {
  return criarObservacoesETransicionar(id, itens, ator, ACOES.REPROVAR, 'REPROVACAO_MEDICAO');
}
function solicitarCorrecao(id, itens, ator) {
  return criarObservacoesETransicionar(id, itens, ator, ACOES.SOLICITAR_CORRECAO_DOCUMENTAL, 'CORRECAO_DOCUMENTAL');
}

// Coordenador adiciona uma observação avulsa (mesma rodada corrente).
async function adicionarObservacao(id, texto, tipo, ator) {
  if (ator.perfil !== 'COORDENADOR') { const e = new Error('Apenas o coordenador.'); e.status = 403; throw e; }
  if (!texto || !texto.trim()) { const e = new Error('Texto obrigatório.'); e.status = 400; throw e; }
  return prisma.$transaction(async (tx) => {
    const { numero, rodadaMax } = await proximoNumero(tx, id);
    const obs = await tx.observacao.create({
      data: {
        relatorioId: id, autorId: ator.id, tipo: tipo || 'REPROVACAO_MEDICAO',
        origem: 'COORDENADOR', numero, rodada: Math.max(rodadaMax, 1), texto: texto.trim(),
      },
    });
    await audit.registrar(tx, { relatorioId: id, atorId: ator.id, acao: 'ADICIONAR_OBSERVACAO', detalhe: { numero } });
    return obs;
  });
}

// Colaborador declara atendido/não atendido em cada observação.
async function declararObservacoes(id, itens, ator) {
  const relatorio = await obterRelatorio(id);
  if (relatorio.autorId !== ator.id) { const e = new Error('Apenas o autor declara.'); e.status = 403; throw e; }
  const obsDoRelatorio = await prisma.observacao.findMany({ where: { relatorioId: id }, select: { id: true } });
  const idsValidos = new Set(obsDoRelatorio.map((o) => o.id));
  return prisma.$transaction(async (tx) => {
    for (const it of itens || []) {
      if (!idsValidos.has(it.id)) continue;
      if (!['ATENDIDO', 'NAO_ATENDIDO', 'PENDENTE'].includes(it.status)) continue;
      await tx.observacao.update({
        where: { id: it.id },
        data: { statusColaborador: it.status, declaracao: it.declaracao || null },
      });
    }
    await audit.registrar(tx, { relatorioId: id, atorId: ator.id, acao: 'DECLARAR_OBSERVACOES' });
    return { ok: true };
  });
}

// Coordenador confirma (ou reabre) o que o colaborador declarou.
async function confirmarObservacoes(id, itens, ator) {
  if (ator.perfil !== 'COORDENADOR') { const e = new Error('Apenas o coordenador.'); e.status = 403; throw e; }
  const obs = await prisma.observacao.findMany({ where: { relatorioId: id } });
  const mapa = new Map(obs.map((o) => [o.id, o]));
  return prisma.$transaction(async (tx) => {
    for (const it of itens || []) {
      const o = mapa.get(it.id);
      if (!o) continue;
      if (!['CONFIRMADO', 'REABERTO', 'PENDENTE'].includes(it.confirmacao)) continue;
      await tx.observacao.update({ where: { id: it.id }, data: { confirmacao: it.confirmacao } });
      // Aprendizado: erro reaberto (persistiu) vira diretriz para a IA.
      if (it.confirmacao === 'REABERTO') {
        await ia.registrarAprendizado(o.texto, 'observacao_confirmada', tx);
      }
    }
    await audit.registrar(tx, { relatorioId: id, atorId: ator.id, acao: 'CONFIRMAR_OBSERVACOES' });
    return { ok: true };
  });
}

// ----------------------------------------------------------------------------
// Exclusão lógica (registro e histórico preservados)
// ----------------------------------------------------------------------------

async function excluir(id, ator) {
  const relatorio = await obterRelatorio(id);
  if (ator.perfil !== 'COORDENADOR') {
    const e = new Error('Apenas o coordenador pode excluir relatórios.'); e.status = 403; throw e;
  }
  if (relatorio.excluidoEm) return relatorio; // já excluído
  return prisma.$transaction(async (tx) => {
    const r = await tx.relatorio.update({
      where: { id }, data: { excluidoEm: new Date(), excluidoPorId: ator.id },
    });
    await audit.registrar(tx, {
      relatorioId: id, atorId: ator.id, acao: 'EXCLUIR_RELATORIO',
      detalhe: { estadoNoMomento: relatorio.estado },
    });
    return r;
  });
}

// ----------------------------------------------------------------------------
// Análise por IA
// ----------------------------------------------------------------------------

async function analisarIA(id, ator) {
  if (ator.perfil !== 'COORDENADOR') { const e = new Error('Apenas o coordenador.'); e.status = 403; throw e; }
  const relatorio = await obterRelatorio(id);
  const resultado = await ia.analisar(relatorio);
  const analise = await prisma.$transaction(async (tx) => {
    const a = await tx.analiseIA.create({
      data: {
        relatorioId: id, versaoAnalisada: relatorio.versaoAtual,
        modelo: resultado.modelo, resumo: resultado.resumo,
      },
    });
    let n = 1;
    for (const it of resultado.itens) {
      await tx.analiseIAItem.create({
        data: { analiseId: a.id, numero: n++, texto: it.texto, severidade: it.severidade || null },
      });
    }
    await audit.registrar(tx, { relatorioId: id, atorId: ator.id, acao: 'ANALISE_IA', detalhe: { itens: resultado.itens.length, modelo: resultado.modelo } });
    return tx.analiseIA.findUnique({ where: { id: a.id }, include: { itens: { orderBy: { numero: 'asc' } } } });
  });
  return analise;
}

// Coordenador aceita/rejeita itens da análise. Rejeições viram aprendizado.
async function decidirAnaliseItens(id, decisoes, ator) {
  if (ator.perfil !== 'COORDENADOR') { const e = new Error('Apenas o coordenador.'); e.status = 403; throw e; }
  return prisma.$transaction(async (tx) => {
    for (const d of decisoes || []) {
      if (typeof d.aceito !== 'boolean') continue;
      const item = await tx.analiseIAItem.update({ where: { id: d.itemId }, data: { aceito: d.aceito } });
      if (d.aceito === false) await ia.registrarAprendizado(item.texto, 'ia_rejeitada', tx);
    }
    await audit.registrar(tx, { relatorioId: id, atorId: ator.id, acao: 'DECIDIR_ANALISE_IA' });
    return { ok: true };
  });
}

module.exports = {
  criar,
  executarTransicao,
  reenviar,
  listar,
  detalhar,
  historico,
  reprovar,
  solicitarCorrecao,
  adicionarObservacao,
  declararObservacoes,
  confirmarObservacoes,
  excluir,
  analisarIA,
  decidirAnaliseItens,
  // helpers reutilizados pelo serviço de anexos
  obterRelatorio,
  autorizarAcesso,
};
