// Controller de projetos de dosagem e caracterização de material.
const service = require('../services/dosagem.service');

module.exports = {
  async criar(req, res, next) {
    try { res.status(201).json(await service.criar(req.body, req.usuario)); } catch (e) { next(e); }
  },
  async listar(req, res, next) {
    try { res.json(await service.listar(req.usuario)); } catch (e) { next(e); }
  },
  async detalhar(req, res, next) {
    try { res.json(await service.detalhar(req.params.id, req.usuario)); } catch (e) { next(e); }
  },
  async atualizar(req, res, next) {
    try { res.json(await service.atualizar(req.params.id, req.body, req.usuario)); } catch (e) { next(e); }
  },
  async excluir(req, res, next) {
    try { res.json(await service.excluir(req.params.id, req.usuario)); } catch (e) { next(e); }
  },
  async anexar(req, res, next) {
    try { res.status(201).json(await service.anexar(req.params.id, req.files, req.usuario)); } catch (e) { next(e); }
  },
  async download(req, res, next) {
    try {
      const { stream, nomeArquivo, contentType } = await service.prepararDownload(req.params.id, req.usuario);
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomeArquivo)}"`);
      stream.on('error', next);
      stream.pipe(res);
    } catch (e) { next(e); }
  },
};
