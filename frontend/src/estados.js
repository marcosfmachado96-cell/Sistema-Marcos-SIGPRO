// Rótulos, cores e ordem dos estados — espelham a máquina de estados do backend.

export const ROTULOS = {
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em análise',
  REPROVADO: 'Reprovado',
  APROVADO: 'Aprovado',
  AGUARDANDO_ATESTO: 'Aguardando atesto',
  CORRECAO_DOCUMENTAL: 'Correção documental',
  CONCLUIDO: 'Concluído',
};

// Classe de badge por estado.
export const BADGE = {
  ENVIADO: 'badge-azul',
  EM_ANALISE: 'badge-azul',
  REPROVADO: 'badge-vermelho',
  APROVADO: 'badge-verde',
  AGUARDANDO_ATESTO: 'badge-ambar',
  CORRECAO_DOCUMENTAL: 'badge-ambar',
  CONCLUIDO: 'badge-grafite',
};

// Trilha principal do pipeline (caminho feliz). REPROVADO e CORRECAO_DOCUMENTAL
// são desvios, exibidos como anotação fora da trilha.
export const TRILHA = [
  'ENVIADO',
  'EM_ANALISE',
  'APROVADO',
  'AGUARDANDO_ATESTO',
  'CONCLUIDO',
];

// Para posicionar um estado de desvio na trilha.
export const ANCORA_DESVIO = {
  REPROVADO: 'EM_ANALISE',
  CORRECAO_DOCUMENTAL: 'AGUARDANDO_ATESTO',
};

export function rotulo(estado) {
  return ROTULOS[estado] || estado;
}
