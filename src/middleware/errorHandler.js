// Tratamento centralizado de erros. Converte erros de domínio em respostas HTTP.
function errorHandler(err, req, res, _next) {
  // Erros de upload (multer): limite de tamanho excedido, etc.
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ erro: `Falha no upload: ${err.message}` });
  }
  const status = err.status || 500;
  if (status >= 500) {
    // Log interno; não vaza detalhes sensíveis ao cliente.
    console.error(err);
  }
  return res.status(status).json({
    erro: status >= 500 ? 'Erro interno do servidor.' : err.message,
  });
}

module.exports = errorHandler;
