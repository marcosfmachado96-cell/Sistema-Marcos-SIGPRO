// Retenção de medições: relatórios CONCLUÍDOS há mais de DIAS_RETENCAO dias
// são apagados por completo — registro, versões, anexos (também no storage),
// observações, atestos, análises de IA e log de auditoria — para poupar
// espaço. Ação irreversível; roda automaticamente dentro do próprio
// processo (sem serviço de cron separado), uma vez por dia.
const prisma = require('../lib/prisma');
const storage = require('../lib/storage');

const DIAS_RETENCAO = 90;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Data em que o relatório entrou em CONCLUIDO pela última vez (uma reabertura
// seguida de nova aprovação reinicia a contagem). Cai para atualizadoEm se,
// por algum motivo, não houver log da transição.
async function dataDeConclusao(relatorioId, fallback) {
  const log = await prisma.logAuditoria.findFirst({
    where: { relatorioId, estadoPara: 'CONCLUIDO' },
    orderBy: { criadoEm: 'desc' },
  });
  return log?.criadoEm || fallback;
}

async function excluirRelatorio(relatorio) {
  const anexos = await prisma.anexo.findMany({ where: { relatorioId: relatorio.id } });
  for (const a of anexos) {
    await storage.removerObjeto(a.chaveS3).catch((e) => {
      console.error(`[limpeza] Falha ao remover anexo ${a.id} (${a.chaveS3}) do storage:`, e.message);
    });
  }

  const analises = await prisma.analiseIA.findMany({ where: { relatorioId: relatorio.id }, select: { id: true } });
  const analiseIds = analises.map((a) => a.id);

  await prisma.$transaction([
    prisma.analiseIAItem.deleteMany({ where: { analiseId: { in: analiseIds } } }),
    prisma.analiseIA.deleteMany({ where: { relatorioId: relatorio.id } }),
    prisma.logAuditoria.deleteMany({ where: { relatorioId: relatorio.id } }),
    prisma.anexo.deleteMany({ where: { relatorioId: relatorio.id } }),
    prisma.observacao.deleteMany({ where: { relatorioId: relatorio.id } }),
    prisma.atesto.deleteMany({ where: { relatorioId: relatorio.id } }),
    prisma.relatorioVersao.deleteMany({ where: { relatorioId: relatorio.id } }),
    prisma.relatorio.delete({ where: { id: relatorio.id } }),
  ]);
}

async function executar() {
  const limite = new Date(Date.now() - DIAS_RETENCAO * UM_DIA_MS);
  const candidatos = await prisma.relatorio.findMany({
    where: { estado: 'CONCLUIDO' },
    select: { id: true, numMedicao: true, atualizadoEm: true },
  });

  let excluidos = 0;
  for (const r of candidatos) {
    const concluidoEm = await dataDeConclusao(r.id, r.atualizadoEm);
    if (concluidoEm > limite) continue;
    try {
      await excluirRelatorio(r);
      excluidos++;
      console.log(`[limpeza] Relatório "${r.numMedicao}" (${r.id}) excluído — concluído em ${concluidoEm.toISOString()}.`);
    } catch (e) {
      console.error(`[limpeza] Falha ao excluir relatório ${r.id}:`, e.message);
    }
  }
  if (excluidos > 0) {
    console.log(`[limpeza] ${excluidos} relatório(s) concluído(s) há mais de ${DIAS_RETENCAO} dias excluído(s) permanentemente.`);
  }
  return excluidos;
}

// Primeira execução pouco depois de o servidor subir, depois a cada 24h.
function iniciar() {
  setTimeout(() => { executar().catch((e) => console.error('[limpeza] erro:', e)); }, 60 * 1000);
  setInterval(() => { executar().catch((e) => console.error('[limpeza] erro:', e)); }, UM_DIA_MS);
}

module.exports = { executar, iniciar, DIAS_RETENCAO };
