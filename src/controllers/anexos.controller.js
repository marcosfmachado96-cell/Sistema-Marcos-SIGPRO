// Controller de anexos — upload de medição, documentação fiscal, atesto e download.
const service = require('../services/anexos.service');

module.exports = {
  async anexarMedicao(req, res, next) {
    try {
      res.status(201).json(await service.anexarMedicao(req.params.id, req.files, req.usuario));
    } catch (e) { next(e); }
  },

  async incluirDocumentacaoFiscal(req, res, next) {
    try {
      res.json(await service.incluirDocumentacaoFiscal(req.params.id, req.files, req.usuario));
    } catch (e) { next(e); }
  },

  async registrarAtesto(req, res, next) {
    try {
      res.json(await service.registrarAtesto(req.params.id, req.file, req.body.observacoes, req.usuario));
    } catch (e) { next(e); }
  },

  // Aprovação com relatório assinado (campo 'arquivo').
  async aprovar(req, res, next) {
    try {
      res.json(await service.aprovarComAssinatura(req.params.id, req.file, req.usuario));
    } catch (e) { next(e); }
  },

  // Download autenticado: transmite o arquivo pelo backend (local ou S3).
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
