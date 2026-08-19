// Serviço de anexos. Concentra as operações que envolvem arquivos e que, em
// alguns casos, disparam transições da máquina de estados:
//  - anexar anexos de MEDIÇÃO (sem transição; só antes da aprovação)
//  - aprovar com relatório assinado (EM_ANALISE -> CONCLUIDO)
//  - download seguro, sempre verificando relatório + perfil
//
// As guardas de estado/perfil são delegadas à máquina de estados
// (resolverTransicao), garantindo as mesmas regras validadas na Etapa 3.

const prisma = require('../lib/prisma');
const audit = require('../lib/audit');
const storage = require('../lib/storage');
const rel = require('./relatorios.service');
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
//  - ATESTO: conta quantos atestos já foram inseridos (processo reaberto
//    e atestado de novo ganha REV01, REV02...).
//  - RELATORIO_ASSINADO: não se repete (só existe uma aprovação), sem sufixo.
async function calcularRevisao(relatorioId, categoria, relatorio) {
  if (categoria === 'MEDICAO') return Math.max(0, relatorio.versaoAtual - 1);
  if (categoria === 'DOC_FISCAL') {
    return prisma.logAuditoria.count({
      where: { relatorioId, acao: { in: ['ANEXAR_DOC_FISCAL', 'REENVIAR_DOCUMENTOS'] } },
    });
  }
  if (categoria === 'ATESTO') {
    return prisma.logAuditoria.count({ where: { relatorioId, acao: 'INSERIR_ATESTO' } });
  }
  return 0;
}

// Planilhas (xlsx/xls) exigem que o colaborador identifique o conteúdo
// (ex.: "Resumo Controle Tecnológico", "Planilha AS BUILT").
const MIMES_PLANILHA = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
];
function ehPlanilha(f) {
  const nome = String(f?.originalname || '').toLowerCase();
  return nome.endsWith('.xlsx') || nome.endsWith('.xls') || MIMES_PLANILHA.includes(f?.mimetype);
}

// Envia os arquivos ao storage e devolve os metadados (sem buffer).
// O nome exibido/baixado é padronizado por tipo, número da medição, contrato e revisão.
// `descricoes[i]` (opcional) vira o rótulo do arquivo em arquivos[i].
async function persistir(relatorioId, categoria, arquivos, versaoId, atorId, descricoes = []) {
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
    const descricao = String(descricoes[i] || '').trim();
    registros.push({
      relatorioId,
      versaoId: versaoId || null,
      categoria,
      nomeArquivo: nome,
      descricao: descricao || null,
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
async function anexarMedicao(id, arquivos, ator, descricoes = []) {
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
  // Planilhas exigem uma descrição do que o arquivo é (ex.: "Planilha AS BUILT").
  arquivos.forEach((f, i) => {
    if (ehPlanilha(f) && !String(descricoes[i] || '').trim()) {
      const e = new Error(`Descreva o conteúdo da planilha "${f.originalname}" antes de enviar.`);
      e.status = 400;
      throw e;
    }
  });

  const vId = await versaoAtualId(id, relatorio.versaoAtual);
  const registros = await persistir(id, 'MEDICAO', arquivos, vId, ator.id, descricoes);

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
// Aprovação com relatório assinado pelo coordenador (EM_ANALISE -> CONCLUIDO)
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
  aprovarComAssinatura,
  prepararDownload,
};
