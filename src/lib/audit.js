// Registro padronizado no log de auditoria.
// Toda transição de estado e ação relevante passa por aqui (rastreabilidade).
const prisma = require('./prisma');

async function registrar(tx, { relatorioId, atorId, acao, estadoDe, estadoPara, detalhe }) {
  const client = tx || prisma;
  return client.logAuditoria.create({
    data: {
      relatorioId: relatorioId || null,
      atorId,
      acao,
      estadoDe: estadoDe || null,
      estadoPara: estadoPara || null,
      detalhe: detalhe || undefined,
    },
  });
}

module.exports = { registrar };
