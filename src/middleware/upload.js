// Middleware de upload (multer) — mantém o arquivo em memória para enviá-lo
// ao storage. Limita o tamanho e restringe os tipos permitidos por categoria.
const multer = require('multer');
const env = require('../config/env');

function criarUpload(mimesPermitidos, descricaoTipos) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.upload.maxMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (mimesPermitidos.includes(file.mimetype)) return cb(null, true);
      const e = new Error(`Tipo de arquivo não permitido. Aceitos: ${descricaoTipos}.`);
      e.status = 400;
      return cb(e);
    },
  });
}

// Padrão: PDF e planilhas (medição, relatório assinado).
const upload = criarUpload(env.upload.mimesPermitidos, 'PDF e planilhas (xlsx, xls, csv)');

// Eventos do Mapa Operacional: além dos tipos padrão, aceita fotos.
const uploadEvento = criarUpload(
  [...env.upload.mimesPermitidos, ...env.upload.mimesImagem],
  'PDF, planilhas (xlsx, xls, csv) e fotos (jpg, png, webp)'
);

module.exports = upload;
module.exports.uploadEvento = uploadEvento;
