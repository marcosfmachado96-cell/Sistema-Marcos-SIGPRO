// Camada de armazenamento de anexos — agnóstica de provedor, com dois drivers:
//  - 's3'    : Amazon S3 ou compatível (Cloudflare R2, MinIO). Download por URL assinada.
//  - 'local' : disco local. Útil para TESTAR sem bucket. Não usar em produção
//              (o disco é efêmero em hospedagens gerenciadas).
//
// O driver é resolvido automaticamente: usa 's3' se as credenciais estiverem
// configuradas; caso contrário 'local'. Pode ser forçado via STORAGE_DRIVER.
//
// Decisões: acervo append-only (sem remoção); o objeto nunca é público —
// no S3 via URL assinada, no local via endpoint autenticado que faz streaming.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('../config/env');

function s3Configurado() {
  return !!(env.s3.bucket && env.s3.accessKey && env.s3.secretKey);
}

// Driver efetivo: forçado por STORAGE_DRIVER, ou automático.
function driver() {
  if (env.storage.driver === 's3' || env.storage.driver === 'local') return env.storage.driver;
  return s3Configurado() ? 's3' : 'local';
}

function configurado() {
  return driver() === 'local' || s3Configurado();
}

// Chave previsível e única: relatorios/<id>/<categoria>/<rand>-<nome-limpo>
function montarChave(relatorioId, categoria, nomeArquivo) {
  const sufixo = crypto.randomBytes(8).toString('hex');
  const limpo = String(nomeArquivo).replace(/[^\w.\-]/g, '_').slice(0, 120);
  return `relatorios/${relatorioId}/${categoria.toLowerCase()}/${sufixo}-${limpo}`;
}

// ----------------------------- driver S3 -----------------------------
let s3 = null;
function clientS3() {
  if (s3) return s3;
  s3 = new S3Client({
    region: env.s3.regiao || 'auto',
    endpoint: env.s3.endpoint || undefined,
    forcePathStyle: !!env.s3.endpoint,
    credentials: { accessKeyId: env.s3.accessKey, secretAccessKey: env.s3.secretKey },
  });
  return s3;
}

// ---------------------------- driver local ----------------------------
// Resolve o caminho absoluto e garante que fica dentro de localDir (anti-traversal).
function caminhoLocal(chave) {
  const base = path.resolve(env.storage.localDir);
  const alvo = path.resolve(base, chave);
  if (alvo !== base && !alvo.startsWith(base + path.sep)) {
    const e = new Error('Caminho de anexo inválido.'); e.status = 400; throw e;
  }
  return alvo;
}

// ------------------------------ operações ------------------------------
async function enviarObjeto({ chave, buffer, contentType }) {
  if (driver() === 'local') {
    const alvo = caminhoLocal(chave);
    await fsp.mkdir(path.dirname(alvo), { recursive: true });
    await fsp.writeFile(alvo, buffer);
    return chave;
  }
  await clientS3().send(new PutObjectCommand({
    Bucket: env.s3.bucket, Key: chave, Body: buffer, ContentType: contentType,
  }));
  return chave;
}

// Descritor de leitura para o endpoint de download.
//  - s3    : { modo:'url', url }       -> o controller redireciona
//  - local : { modo:'arquivo', caminho } -> o controller faz streaming
async function prepararLeitura(chave, nomeArquivo, expiraSegundos) {
  if (driver() === 'local') {
    const caminho = caminhoLocal(chave);
    if (!fs.existsSync(caminho)) { const e = new Error('Arquivo não encontrado.'); e.status = 404; throw e; }
    return { modo: 'arquivo', caminho, nomeArquivo };
  }
  const expiresIn = Math.min(expiraSegundos || env.s3.downloadExpiraSegundos, 604800);
  const cmd = new GetObjectCommand({
    Bucket: env.s3.bucket, Key: chave,
    ResponseContentDisposition: nomeArquivo ? `attachment; filename="${nomeArquivo}"` : undefined,
  });
  return { modo: 'url', url: await getSignedUrl(clientS3(), cmd, { expiresIn }) };
}

// Link para uso em e-mail. No S3, URL assinada de longa duração; no local,
// aponta para o endpoint autenticado do próprio app (exige login).
async function linkDownload(anexo, expiraSegundos) {
  if (driver() === 'local') {
    return `${env.app.urlBase}/api/anexos/${anexo.id}/download`;
  }
  const expiresIn = Math.min(expiraSegundos || env.s3.linkEmailExpiraSegundos, 604800);
  const cmd = new GetObjectCommand({
    Bucket: env.s3.bucket, Key: anexo.chaveS3,
    ResponseContentDisposition: `attachment; filename="${anexo.nomeArquivo}"`,
  });
  return getSignedUrl(clientS3(), cmd, { expiresIn });
}

// Stream de leitura do objeto, para download autenticado via backend.
// Funciona nos dois drivers (disco local ou S3), sem expor o objeto.
async function obterStream(chave) {
  if (driver() === 'local') {
    const caminho = caminhoLocal(chave);
    if (!fs.existsSync(caminho)) { const e = new Error('Arquivo nao encontrado.'); e.status = 404; throw e; }
    return fs.createReadStream(caminho);
  }
  const r = await clientS3().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: chave }));
  return r.Body; // Readable (Node) no AWS SDK v3
}

// Lê o objeto inteiro como Buffer (usado pela IA para extrair o texto do PDF).
async function obterBuffer(chave) {
  const stream = await obterStream(chave);
  const partes = [];
  for await (const p of stream) partes.push(typeof p === 'string' ? Buffer.from(p) : p);
  return Buffer.concat(partes);
}

module.exports = { driver, configurado, montarChave, enviarObjeto, prepararLeitura, obterStream, obterBuffer, linkDownload };
