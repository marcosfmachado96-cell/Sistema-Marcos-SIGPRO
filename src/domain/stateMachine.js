// Máquina de estados do relatório de medição.
// Define as transições válidas e as guardas (pré-condições) de cada uma.
// Qualquer transição fora deste mapa é rejeitada — e toda transição aceita
// é registrada no log de auditoria pela camada de serviço.

const ESTADOS = {
  ENVIADO: 'ENVIADO',
  EM_ANALISE: 'EM_ANALISE',
  REPROVADO: 'REPROVADO',
  APROVADO: 'APROVADO',
  AGUARDANDO_ATESTO: 'AGUARDANDO_ATESTO',
  CORRECAO_DOCUMENTAL: 'CORRECAO_DOCUMENTAL',
  CONCLUIDO: 'CONCLUIDO',
};

// Ações que disparam transições.
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
    [ACOES.APROVAR]:  { destino: ESTADOS.APROVADO,  perfil: 'COORDENADOR' },
    [ACOES.REPROVAR]: { destino: ESTADOS.REPROVADO, perfil: 'COORDENADOR', exigeObservacao: true },
  },
  [ESTADOS.REPROVADO]: {
    // Ao reenviar, volta para EM_ANALISE preservando o histórico de versões.
    [ACOES.REENVIAR]: { destino: ESTADOS.EM_ANALISE, perfil: 'USUARIO', criaVersao: true },
  },
  [ESTADOS.APROVADO]: {
    // Anexar documentação fiscal -> AGUARDANDO_ATESTO + e-mail ao financeiro.
    [ACOES.ANEXAR_DOC_FISCAL]: { destino: ESTADOS.AGUARDANDO_ATESTO, perfil: 'USUARIO', exigeAnexo: 'DOC_FISCAL' },
  },
  [ESTADOS.AGUARDANDO_ATESTO]: {
    [ACOES.INSERIR_ATESTO]: { destino: ESTADOS.CONCLUIDO, perfil: 'COORDENADOR' },
    [ACOES.SOLICITAR_CORRECAO_DOCUMENTAL]: { destino: ESTADOS.CORRECAO_DOCUMENTAL, perfil: 'COORDENADOR', exigeObservacao: true },
  },
  [ESTADOS.CORRECAO_DOCUMENTAL]: {
    [ACOES.REENVIAR_DOCUMENTOS]: { destino: ESTADOS.AGUARDANDO_ATESTO, perfil: 'USUARIO', exigeAnexo: 'DOC_FISCAL' },
  },
  [ESTADOS.CONCLUIDO]: {
    // Reabertura: volta para CORRECAO_DOCUMENTAL, mesma tela em que o autor já
    // reenvia documentação fiscal — permite novo atesto sem perder o histórico.
    [ACOES.REABRIR]: { destino: ESTADOS.CORRECAO_DOCUMENTAL, perfil: 'COORDENADOR', exigeObservacao: true },
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
