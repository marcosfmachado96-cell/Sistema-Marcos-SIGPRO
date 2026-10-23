// Controller da Equipe de Administração Local (contratos, equipe e alterações de prazo).
const service = require('../services/equipeContrato.service');

const rota = (fn, status) => async (req, res, next) => {
  try { const r = await fn(req); res.status(status || 200).json(r); } catch (e) { next(e); }
};

module.exports = {
  criar: rota((req) => service.criar(req.body, req.usuario), 201),
  listar: rota(() => service.listar()),
  sobreposicoes: rota(() => service.sobreposicoes()),
  detalhar: rota((req) => service.detalhar(req.params.id)),
  atualizar: rota((req) => service.atualizar(req.params.id, req.body, req.usuario)),
  excluir: rota((req) => service.excluir(req.params.id, req.usuario)),
  adicionarMembro: rota((req) => service.adicionarMembro(req.params.id, req.body, req.usuario), 201),
  atualizarMembro: rota((req) => service.atualizarMembro(req.params.membroId, req.body, req.usuario)),
  removerMembro: rota((req) => service.removerMembro(req.params.membroId, req.usuario)),
  adicionarAlteracao: rota((req) => service.adicionarAlteracao(req.params.id, req.body, req.usuario), 201),
  removerAlteracao: rota((req) => service.removerAlteracao(req.params.alteracaoId, req.usuario)),
};
