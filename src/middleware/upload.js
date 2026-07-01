// Middleware de upload (multer) — mantém o arquivo em memória para enviá-lo
// ao storage. Limita o tamanho e restringe os tipos a PDF e planilhas.
const multer = require('multer');
const env = require('../config/env');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.upload.maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (env.upload.mimesPermitidos.includes(file.mimetype)) return cb(null, true);
    const e = new Error('Tipo de arquivo não permitido. Aceitos: PDF e planilhas (xlsx, xls, csv).');
    e.status = 400;
    return cb(e);
  },
});

module.exports = upload;
