// Ponto de entrada do servidor.
const app = require('./app');
const env = require('./config/env');
const limpezaRelatorios = require('./jobs/limpezaRelatorios');

app.listen(env.porta, () => {
  console.log(`Servidor ouvindo na porta ${env.porta} (${env.ambiente})`);
  limpezaRelatorios.iniciar();
});
