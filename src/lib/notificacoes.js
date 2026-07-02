// Templates e disparos de notificação por e-mail.
//
// Por decisão do coordenador, transições de fase não disparam e-mail para
// coordenador nem colaborador — só o aviso ao financeiro (fora desse par)
// permanece automático, pois é isso que destrava o atesto contábil.
//
// Decisão: o e-mail ao financeiro leva LINKS de download assinados (não os
// arquivos anexados). Isso evita os limites de tamanho e o risco de spam ao
// enviar por conta de e-mail pessoal, conforme discutido.

const mailer = require('./mailer');
const env = require('../config/env');

// Datas puras (período da medição) são gravadas como meia-noite UTC — exibir
// em UTC evita depender do fuso do servidor para mostrar a data certa.
function fmtData(d) {
  try { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); } catch { return String(d); }
}
function fmtValor(v) {
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function blocoMedicao(relatorio, autor) {
  return `<ul>
    <li><b>Medição:</b> ${relatorio.numMedicao}</li>
    <li><b>Contrato:</b> ${relatorio.contrato}</li>
    <li><b>Objeto:</b> ${relatorio.objeto}</li>
    <li><b>Contratada:</b> ${autor?.contratada || '-'}</li>
    <li><b>Período:</b> ${fmtData(relatorio.periodoInicio)} a ${fmtData(relatorio.periodoFim)}</li>
    <li><b>Valor:</b> ${fmtValor(relatorio.valor)}</li>
  </ul>`;
}
function listaLinks(links) {
  if (!links || links.length === 0) return '<p>(sem documentos)</p>';
  const itens = links.map((l) => `<li><a href="${l.url}">${l.nome}</a></li>`).join('');
  return `<ul>${itens}</ul>`;
}

// Automático ao incluir documentação fiscal. links = [{nome, url}]
async function financeiroSolicitaAtesto({ relatorio, autor, links, replyTo }) {
  return mailer.enviar({
    para: env.email.financeiro,
    replyTo,
    assunto: `Solicitação de atesto contábil — Medição ${relatorio.numMedicao} (${relatorio.contrato})`,
    html: `<p>Prezados,</p>
      <p>A documentação fiscal da medição abaixo foi incluída no sistema e segue para atesto contábil.</p>
      ${blocoMedicao(relatorio, autor)}
      <p>Documentos fiscais (links válidos por tempo limitado):</p>
      ${listaLinks(links)}`,
  });
}

module.exports = {
  financeiroSolicitaAtesto,
};
