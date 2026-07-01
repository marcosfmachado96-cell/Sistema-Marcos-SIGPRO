// Ponto de entrada do servidor.
const app = require('./app');
const env = require('./config/env');

app.listen(env.porta, () => {
  console.log(`Servidor ouvindo na porta ${env.porta} (${env.ambiente})`);
});
