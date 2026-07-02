// Serviço de anexos. Concentra as operações que envolvem arquivos e que, em
// alguns casos, disparam transições da máquina de estados:
//  - anexar anexos de MEDIÇÃO (sem transição; só antes da aprovação)
//  - incluir DOCUMENTAÇÃO FISCAL (APROVADO/CORRECAO_DOCUMENTAL -> AGUARDANDO_ATESTO)
//    com e-mail automático ao financeiro (links assinados)
//  - registrar o ATESTO contábil (AGUARDANDO_ATESTO -> CONCLUIDO)
//  - download seguro, sempre verificando relatório + perfil
//
// As guardas de estado/perfil são delegadas à máquina de estados
// (resolverTransicao), garantindo as mesmas regras validadas na Etapa 3.

const prisma = require('../lib/prisma');
const audit = require('../lib/audit');
const storage = require('../lib/storage');
const notificacoes = require('../lib/notificacoes');
const rel = require('./relatorios.service');
const env = require('../config/env');
const { ESTADOS, ACOES, resolverTransicao } = require('../domain/stateMachine');

// Estados em que o autor ainda pode anexar anexos de medição.
const ESTADOS_EDICAO_MEDICAO = [ESTADOS.ENVIADO, ESTADOS.EM_ANALISE, ESTADOS.REPROVADO];

async function versaoAtualId(relatorioId, numeroVersao) {
  const v = await prisma.relatorioVersao.findUnique({
    where: { relatorioId_numeroVersao: { relatorioId, numeroVersao } },
  });
  return v ? v.id : null;
}

// Limpa um texto para uso seguro em nome de arquivo.
function limparNome(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Nome padronizado: <Tipo>_Med<numMedicao>_Contr<contrato>[_REVNN][_n].<ext>
function nomePadronizado(categoria, relatorio, original, indice, revisao) {
  const m = String(original || '').match(/\.[^.]+$/);
  const ext = m ? m[0].toLowerCase() : '';
  const prefixo = {
    MEDICAO: 'Medicao',
    DOC_FISCAL: 'DocFiscal',
    ATESTO: 'Atesto',
    RELATORIO_ASSINADO: 'RelatorioAssinado',
  }[categoria] || 'Documento';
  const base = [prefixo, `Med${limparNome(relatorio?.numMedicao)}`, `Contr${limparNome(relatorio?.contrato)}`].join('_');
  const rev = revisao > 0 ? `_REV${String(revisao).padStart(2, '0')}` : '';
  const sufixo = indice && indice > 0 ? `_${indice + 1}` : '';
  return `${base}${rev}${sufixo}${ext}`;
}

// Nº da revisão para o sufixo REVNN do nome do arquivo:
//  - MEDICAO: acompanha a versão do relatório (reenvio após reprovação).
//  - DOC_FISCAL: conta quantas vezes a documentação fiscal já foi enviada
//    (1ª vez sem sufixo; a partir da 2ª, REV01, REV02...).
//  - demais categorias (ATESTO, RELATORIO_ASSINADO): não se repetem, sem sufixo.
async function calcularRevisao(relatorioId, categoria, relatorio) {
  if (categoria === 'MEDICAO') return Math.max(0, relatorio.versaoAtual - 1);
  if (categoria === 'DOC_FISCAL') {
    return prisma.logAuditoria.count({
      where: { relatorioId, acao: { in: ['ANEXAR_DOC_FISCAL', 'REENVIAR_DOCUMENTOS'] } },
    });
  }
  return 0;
}

// Envia os arquivos ao storage e devolve os metadados (sem buffer).
// O nome exibido/baixado é padronizado por tipo, número da medição, contrato e revisão.
async function persistir(relatorioId, categoria, arquivos, versaoId, atorId) {
  const relatorio = await prisma.relatorio.findUnique({
    where: { id: relatorioId }, select: { numMedicao: true, contrato: true, versaoAtual: true },
  });
  const revisao = await calcularRevisao(relatorioId, categoria, relatorio);
  const registros = [];
  let i = 0;
  for (const f of arquivos) {
    const nome = nomePadronizado(categoria, relatorio, f.originalname, arquivos.length > 1 ? i : null, revisao);
    const chave = storage.montarChave(relatorioId, categoria, nome);
    await storage.enviarObjeto({ chave, buffer: f.buffer, contentType: f.mimetype });
    registros.push({
      relatorioId,
      versaoId: versaoId || null,
      categoria,
      nomeArquivo: nome,
      chaveS3: chave,
      tamanho: f.size,
      contentType: f.mimetype,
      enviadoPorId: atorId,
    });
    i++;
  }
  return registros;
}

// ----------------------------------------------------------------------------
// Anexos de medição (sem transição)
// ----------------------------------------------------------------------------
async function anexarMedicao(id, arquivos, ator) {
  if (!arquivos || arquivos.length === 0) {
    const e = new Error('Nenhum arquivo enviado.'); e.status = 400; throw e;
  }
  const relatorio = await rel.obterRelatorio(id);
  rel.autorizarAcesso(relatorio, ator);
  if (relatorio.autorId !== ator.id) {
    const e = new Error('Apenas o autor pode anexar anexos de medição.'); e.status = 403; throw e;
  }
  if (!ESTADOS_EDICAO_MEDICAO.includes(relatorio.estado)) {
    const e = new Error('Anexos de medição só podem ser incluídos antes da aprovação.'); e.status = 409; throw e;
  }

  const vId = await versaoAtualId(id, relatorio.versaoAtual);
  const registros = await persistir(id, 'MEDICAO', arquivos, vId, ator.id);

  return prisma.$transaction(async (tx) => {
    const criados = [];
    for (const r of registros) criados.push(await tx.anexo.create({ data: r }));
    await audit.registrar(tx, {
      relatorioId: id, atorId: ator.id, acao: 'ANEXAR_MEDICAO',
      detalhe: { quantidade: criados.length },
    });
    return criados;
  });
}

// ----------------------------------------------------------------------------
// Documentação fiscal -> AGUARDANDO_ATESTO + e-mail ao financeiro (com links)
// ----------------------------------------------------------------------------
async function incluirDocumentacaoFiscal(id, arquivos, ator) {
  if (!arquivos || arquivos.length === 0) {
    const e = new Error('Nenhum documento fiscal enviado.'); e.status = 400; throw e;
  }
  const relatorio = await rel.obterRelatorio(id);
  rel.autorizarAcesso(relatorio, ator);

  // Inclusão inicial (a partir de APROVADO) ou reenvio após correção documental.
  const acao = relatorio.estado === ESTADOS.CORRECAO_DOCUMENTAL
    ? ACOES.REENVIAR_DOCUMENTOS
    : ACOES.ANEXAR_DOC_FISCAL;
  const transicao = resolverTransicao(relatorio.estado, acao, ator.perfil); // valida estado + perfil

  const registros = await persistir(id, 'DOC_FISCAL', arquivos, null, ator.id);

  const { atualizado, anexosCriados } = await prisma.$transaction(async (tx) => {
    const criados = [];
    for (const r of registros) criados.push(await tx.anexo.create({ data: r }));
    const up = await tx.relatorio.update({ where: { id }, data: { estado: transicao.destino } });
    await audit.registrar(tx, {
      relatorioId: id, atorId: ator.id, acao,
      estadoDe: relatorio.estado, estadoPara: transicao.destino,
      detalhe: { documentos: criados.length },
    });
    return { atualizado: up, anexosCriados: criados };
  });

  // E-mail ao financeiro (best-effort; falha de e-mail não desfaz a transição).
  try {
    const links = [];
    for (const a of anexosCriados) {
      const url = await storage.linkDownload(a, env.s3.linkEmailExpiraSegundos);
      links.push({ nome: a.nomeArquivo, url });
    }
    await notificacoes.financeiroSolicitaAtesto({
      relatorio: atualizado, links, replyTo: env.email.replyTo || undefined,
    });
  } catch (e) {
    console.error('Falha ao notificar inclusão de documentação fiscal:', e.message);
  }

  return atualizado;
}

// ----------------------------------------------------------------------------
// Atesto contábil -> CONCLUIDO
// ----------------------------------------------------------------------------
async function registrarAtesto(id, arquivo, observacoes, ator) {
  const relatorio = await rel.obterRelatorio(id);
  const transicao = resolverTransicao(relatorio.estado, ACOES.INSERIR_ATESTO, ator.perfil);

  let anexoData = null;
  if (arquivo) {
    const [reg] = await persistir(id, 'ATESTO', [arquivo], null, ator.id);
    anexoData = reg;
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    let anexoId = null;
    if (anexoData) {
      const a = await tx.anexo.create({ data: anexoData });
      anexoId = a.id;
    }
    await tx.atesto.create({
      data: { relatorioId: id, coordenadorId: ator.id, anexoId, observacoes: observacoes || null },
    });
    const up = await tx.relatorio.update({ where: { id }, data: { estado: transicao.destino } });
    await audit.registrar(tx, {
      relatorioId: id, atorId: ator.id, acao: ACOES.INSERIR_ATESTO,
      estadoDe: relatorio.estado, estadoPara: transicao.destino,
    });
    return up;
  });

  return atualizado;
}

// ----------------------------------------------------------------------------
// Download seguro — verifica acesso e devolve URL assinada de curta duração
// ----------------------------------------------------------------------------
async function prepararDownload(anexoId, ator) {
  const anexo = await prisma.anexo.findUnique({
    where: { id: anexoId },
    include: { relatorio: true },
  });
  if (!anexo) { const e = new Error('Anexo não encontrado.'); e.status = 404; throw e; }
  rel.autorizarAcesso(anexo.relatorio, ator);
  const stream = await storage.obterStream(anexo.chaveS3);
  return { stream, nomeArquivo: anexo.nomeArquivo, contentType: anexo.contentType };
}

// ----------------------------------------------------------------------------
// Aprovação com relatório assinado pelo coordenador (EM_ANALISE -> APROVADO)
// ----------------------------------------------------------------------------
async function aprovarComAssinatura(id, arquivo, ator) {
  if (!arquivo) { const e = new Error('Anexe o relatório assinado para aprovar.'); e.status = 400; throw e; }
  const relatorio = await rel.obterRelatorio(id);
  rel.autorizarAcesso(relatorio, ator);
  const transicao = resolverTransicao(relatorio.estado, ACOES.APROVAR, ator.perfil); // valida EM_ANALISE + COORDENADOR

  const [reg] = await persistir(id, 'RELATORIO_ASSINADO', [arquivo], null, ator.id);

  const atualizado = await prisma.$transaction(async (tx) => {
    await tx.anexo.create({ data: reg });
    const up = await tx.relatorio.update({ where: { id }, data: { estado: transicao.destino } });
    await audit.registrar(tx, {
      relatorioId: id, atorId: ator.id, acao: ACOES.APROVAR,
      estadoDe: relatorio.estado, estadoPara: transicao.destino,
      detalhe: { relatorioAssinado: reg.nomeArquivo },
    });
    return up;
  });

  return atualizado;
}

module.exports = {
  anexarMedicao,
  incluirDocumentacaoFiscal,
  registrarAtesto,
  aprovarComAssinatura,
  prepararDownload,
};
