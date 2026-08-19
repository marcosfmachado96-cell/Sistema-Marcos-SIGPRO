export function fmtMoeda(v) {
  const n = Number(v);
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Datas puras (sem hora, ex.: período da medição) são gravadas como meia-noite
// UTC — exibir em UTC evita que o fuso do navegador jogue a data um dia antes.
export function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function fmtDataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function fmtPeriodo(ini, fim) {
  return `${fmtData(ini)} – ${fmtData(fim)}`;
}

// Nomenclatura oficial do DER/PR usa sempre três dígitos (ex.: PR-090, não PR-90).
export function fmtRodovia(numero) {
  return `PR-${String(numero).padStart(3, '0')}`;
}

// Planilhas exigem uma descrição do conteúdo (ex.: "Planilha AS BUILT").
export function ehPlanilha(arquivo) {
  const nome = arquivo.name.toLowerCase();
  return nome.endsWith('.xlsx') || nome.endsWith('.xls');
}
