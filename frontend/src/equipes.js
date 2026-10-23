export const ROTULO_AREA = {
  AREA_01: 'Área 01', AREA_02: 'Área 02', AREA_03: 'Área 03',
  AREA_04: 'Área 04', AREA_05: 'Área 05', SR_LESTE: 'SR Leste',
};

export function fmtPercentual(v) {
  return `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}
