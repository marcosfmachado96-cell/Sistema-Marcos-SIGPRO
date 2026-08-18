// Controller do Mapa Operacional — notas de serviço e histórico de eventos.
const service = require('../services/notaServico.service');

module.exports = {
  async criar(req, res, next) {
    try { res.status(201).json(await service.criar(req.body, req.usuario)); } catch (e) { next(e); }
  },
  async listar(req, res, next) {
    try { res.json(await service.listar()); } catch (e) { next(e); }
  },
  async detalhar(req, res, next) {
    try { res.json(await service.detalhar(req.params.id)); } catch (e) { next(e); }
  },
  async atualizar(req, res, next) {
    try { res.json(await service.atualizar(req.params.id, req.body, req.usuario)); } catch (e) { next(e); }
  },
  async excluir(req, res, next) {
    try { res.json(await service.excluir(req.params.id, req.usuario)); } catch (e) { next(e); }
  },
  async adicionarEvento(req, res, next) {
    try { res.status(201).json(await service.adicionarEvento(req.params.id, req.body, req.usuario)); } catch (e) { next(e); }
  },
  async anexarEvento(req, res, next) {
    try { res.status(201).json(await service.anexarEvento(req.params.eventoId, req.files, req.usuario)); } catch (e) { next(e); }
  },
  async download(req, res, next) {
    try {
      const { stream, nomeArquivo, contentType } = await service.prepararDownload(req.params.id);
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomeArquivo)}"`);
      stream.on('error', next);
      stream.pipe(res);
    } catch (e) { next(e); }
  },
  async rodovias(req, res, next) {
    try { res.json(service.rodoviasDisponiveis()); } catch (e) { next(e); }
  },
};
