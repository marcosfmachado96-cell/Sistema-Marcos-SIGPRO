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

// Padrão: PDF e planilhas (medição, relatório assinado, atesto).
const upload = criarUpload(env.upload.mimesPermitidos, 'PDF e planilhas (xlsx, xls, csv)');

// Documentação fiscal: além dos tipos acima, aceita compactados (zip, rar).
const uploadDocFiscal = criarUpload(
  [...env.upload.mimesPermitidos, ...env.upload.mimesCompactados],
  'PDF, planilhas (xlsx, xls, csv) e compactados (zip, rar)'
);

module.exports = upload;
module.exports.uploadDocFiscal = uploadDocFiscal;
