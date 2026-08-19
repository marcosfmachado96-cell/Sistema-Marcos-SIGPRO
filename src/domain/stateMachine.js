// Máquina de estados do relatório de medição.
// Define as transições válidas e as guardas (pré-condições) de cada uma.
// Qualquer transição fora deste mapa é rejeitada — e toda transição aceita
// é registrada no log de auditoria pela camada de serviço.
//
// APROVADO, AGUARDANDO_ATESTO e CORRECAO_DOCUMENTAL não aparecem mais em
// nenhuma transição: eram a etapa de atesto contábil (documentação fiscal +
// atesto do coordenador), eliminada do processo — a aprovação já conclui o
// relatório. Os valores continuam no enum e nos rótulos do frontend apenas
// para exibir corretamente o histórico de relatórios concluídos antes dessa
// mudança.

const ESTADOS = {
  ENVIADO: 'ENVIADO',
  EM_ANALISE: 'EM_ANALISE',
  REPROVADO: 'REPROVADO',
  APROVADO: 'APROVADO',
  AGUARDANDO_ATESTO: 'AGUARDANDO_ATESTO',
  CORRECAO_DOCUMENTAL: 'CORRECAO_DOCUMENTAL',
  CONCLUIDO: 'CONCLUIDO',
};

// Ações que disparam transições. ANEXAR_DOC_FISCAL, SOLICITAR_CORRECAO_DOCUMENTAL,
// REENVIAR_DOCUMENTOS e INSERIR_ATESTO não disparam mais nenhuma transição (ver
// nota acima) — mantidas aqui só porque ainda aparecem em logs de auditoria antigos.
const ACOES = {
  CRIAR: 'CRIAR',                       // novo relatório -> ENVIADO
  ENVIAR_PARA_ANALISE: 'ENVIAR_PARA_ANALISE',
  REPROVAR: 'REPROVAR',
  REENVIAR: 'REENVIAR',
  APROVAR: 'APROVAR',
  ANEXAR_DOC_FISCAL: 'ANEXAR_DOC_FISCAL',
  SOLICITAR_CORRECAO_DOCUMENTAL: 'SOLICITAR_CORRECAO_DOCUMENTAL',
  REENVIAR_DOCUMENTOS: 'REENVIAR_DOCUMENTOS',
  INSERIR_ATESTO: 'INSERIR_ATESTO',
  REABRIR: 'REABRIR',
};

// perfilExigido: quem pode executar a ação.
// destino: estado resultante.
// As guardas adicionais (texto de observação obrigatório, etc.) são validadas
// na camada de serviço, pois dependem do payload.
const TRANSICOES = {
  [ESTADOS.ENVIADO]: {
    [ACOES.ENVIAR_PARA_ANALISE]: { destino: ESTADOS.EM_ANALISE, perfil: 'USUARIO' },
  },
  [ESTADOS.EM_ANALISE]: {
    // Aprovar já conclui o relatório — sem etapa de atesto contábil.
    [ACOES.APROVAR]:  { destino: ESTADOS.CONCLUIDO,  perfil: 'COORDENADOR' },
    [ACOES.REPROVAR]: { destino: ESTADOS.REPROVADO, perfil: 'COORDENADOR', exigeObservacao: true },
  },
  [ESTADOS.REPROVADO]: {
    // Ao reenviar, volta para EM_ANALISE preservando o histórico de versões.
    [ACOES.REENVIAR]: { destino: ESTADOS.EM_ANALISE, perfil: 'USUARIO', criaVersao: true },
  },
  [ESTADOS.CONCLUIDO]: {
    // Reabertura: volta para EM_ANALISE — o coordenador reavalia e aprova ou
    // reprova de novo; nada do histórico anterior é apagado.
    [ACOES.REABRIR]: { destino: ESTADOS.EM_ANALISE, perfil: 'COORDENADOR', exigeObservacao: true },
  },
};

class TransicaoInvalidaError extends Error {
  constructor(estado, acao) {
    super(`Transição inválida: ação "${acao}" não é permitida a partir do estado "${estado}".`);
    this.name = 'TransicaoInvalidaError';
    this.status = 409;
  }
}

class PermissaoNegadaError extends Error {
  constructor(acao) {
    super(`Perfil sem permissão para executar a ação "${acao}".`);
    this.name = 'PermissaoNegadaError';
    this.status = 403;
  }
}

// Resolve a transição. Lança erro se inválida ou se o perfil não for autorizado.
function resolverTransicao(estadoAtual, acao, perfilAtor) {
  const doEstado = TRANSICOES[estadoAtual] || {};
  const transicao = doEstado[acao];
  if (!transicao) throw new TransicaoInvalidaError(estadoAtual, acao);
  if (transicao.perfil !== perfilAtor) throw new PermissaoNegadaError(acao);
  return transicao;
}

// Lista as ações possíveis a partir de um estado, filtrando por perfil.
function acoesDisponiveis(estadoAtual, perfilAtor) {
  const doEstado = TRANSICOES[estadoAtual] || {};
  return Object.entries(doEstado)
    .filter(([, t]) => t.perfil === perfilAtor)
    .map(([acao]) => acao);
}

module.exports = {
  ESTADOS,
  ACOES,
  TRANSICOES,
  resolverTransicao,
  acoesDisponiveis,
  TransicaoInvalidaError,
  PermissaoNegadaError,
};
