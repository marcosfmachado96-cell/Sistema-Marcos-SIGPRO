// Templates e disparos de notificação por e-mail.
// As notificações ligadas às ações da Etapa 4 (documentação fiscal e atesto)
// estão acionadas. As demais (aprovado/reprovado/novo relatório) ficam prontas
// para a Etapa 6.
//
// Decisão: o e-mail ao financeiro leva LINKS de download assinados (não os
// arquivos anexados). Isso evita os limites de tamanho e o risco de spam ao
// enviar por conta de e-mail pessoal, conforme discutido.

const mailer = require('./mailer');
const env = require('../config/env');

function fmtData(d) {
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return String(d); }
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

// Etapa 4 — automático ao incluir documentação fiscal. links = [{nome, url}]
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

// Etapa 4 — coordenador avisado da inclusão de documentação fiscal.
async function coordenadorDocFiscal({ coordenadorEmail, relatorio, autor }) {
  if (!coordenadorEmail) return;
  return mailer.enviar({
    para: coordenadorEmail,
    assunto: `Documentação fiscal incluída — Medição ${relatorio.numMedicao}`,
    html: `<p>A documentação fiscal foi incluída e o relatório aguarda atesto.</p>
      ${blocoMedicao(relatorio, autor)}`,
  });
}

// Etapa 4 — usuário avisado de que o atesto está disponível (conclusão).
async function usuarioConcluido({ usuarioEmail, relatorio }) {
  if (!usuarioEmail) return;
  return mailer.enviar({
    para: usuarioEmail,
    assunto: `Atesto contábil disponível — Medição ${relatorio.numMedicao}`,
    html: `<p>O atesto contábil da medição ${relatorio.numMedicao} foi emitido e já está
      disponível no sistema. O processo foi concluído.</p>`,
  });
}

// Coordenador avisado de novo relatório (ou reenvio) aguardando análise.
async function coordenadorNovoRelatorio({ coordenadorEmail, relatorio, autor, reenvio }) {
  if (!coordenadorEmail) return;
  return mailer.enviar({
    para: coordenadorEmail,
    assunto: `${reenvio ? 'Relatório reenviado' : 'Novo relatório'} para análise — Medição ${relatorio.numMedicao}`,
    html: `<p>${reenvio ? 'Um relatório foi reenviado' : 'Um novo relatório foi cadastrado'} e aguarda sua análise.</p>
      ${blocoMedicao(relatorio, autor)}`,
  });
}

// Usuário avisado de que precisa corrigir a documentação contábil.
async function usuarioCorrecaoDocumental({ usuarioEmail, relatorio, observacao }) {
  if (!usuarioEmail) return;
  return mailer.enviar({
    para: usuarioEmail,
    assunto: `Correção documental — Medição ${relatorio.numMedicao}`,
    html: `<p>A documentação contábil da medição ${relatorio.numMedicao} precisa de ajustes.
      Observações do coordenador:</p>
      <blockquote>${observacao || ''}</blockquote>
      <p>Reenvie os documentos corrigidos pelo sistema.</p>`,
  });
}

async function usuarioAprovado({ usuarioEmail, relatorio }) {
  if (!usuarioEmail) return;
  return mailer.enviar({
    para: usuarioEmail,
    assunto: `Medição ${relatorio.numMedicao} aprovada`,
    html: `<p>Sua medição ${relatorio.numMedicao} foi aprovada. Você já pode incluir a
      documentação fiscal no sistema.</p>`,
  });
}
async function usuarioReprovado({ usuarioEmail, relatorio, observacao }) {
  if (!usuarioEmail) return;
  return mailer.enviar({
    para: usuarioEmail,
    assunto: `Medição ${relatorio.numMedicao} reprovada — correções necessárias`,
    html: `<p>Sua medição ${relatorio.numMedicao} foi reprovada. Observações do coordenador:</p>
      <blockquote>${observacao || ''}</blockquote>
      <p>Ajuste o relatório e reenvie pelo sistema.</p>`,
  });
}

module.exports = {
  financeiroSolicitaAtesto,
  coordenadorDocFiscal,
  coordenadorNovoRelatorio,
  usuarioConcluido,
  usuarioAprovado,
  usuarioReprovado,
  usuarioCorrecaoDocumental,
};
