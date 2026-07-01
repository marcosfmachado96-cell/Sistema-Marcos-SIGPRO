const service = require('../services/solicitacoes.service');

module.exports = {
  async criar(req, res, next) {
    try { res.status(201).json(await service.criar(req.body, req.usuario)); } catch (e) { next(e); }
  },
  async listar(req, res, next) {
    try { res.json(await service.listar(req.usuario)); } catch (e) { next(e); }
  },
  async responder(req, res, next) {
    try { res.json(await service.responder(req.params.id, req.body, req.usuario)); } catch (e) { next(e); }
  },
};
