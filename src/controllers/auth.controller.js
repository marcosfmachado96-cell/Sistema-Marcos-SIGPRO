// Controllers de autenticação e convites.
const authService = require('../services/auth.service');
const convitesService = require('../services/convites.service');

const auth = {
  async login(req, res, next) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });
      res.json(await authService.login({ email, senha }));
    } catch (e) { next(e); }
  },
  async esqueciSenha(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ erro: 'Informe o e-mail.' });
      await authService.solicitarRedefinicao(email);
      // Resposta genérica: não revela se o e-mail está cadastrado.
      res.json({ mensagem: 'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.' });
    } catch (e) { next(e); }
  },
  async redefinirSenha(req, res, next) {
    try {
      const { token, senha } = req.body;
      if (!token || !senha) return res.status(400).json({ erro: 'Dados incompletos.' });
      if (senha.length < 8) return res.status(400).json({ erro: 'A senha deve ter ao menos 8 caracteres.' });
      await authService.redefinirSenha({ token, novaSenha: senha });
      res.json({ mensagem: 'Senha redefinida com sucesso.' });
    } catch (e) { next(e); }
  },
};

const convites = {
  async criar(req, res, next) {
    try {
      const { email, perfil, contratada } = req.body;
      if (!email) return res.status(400).json({ erro: 'Informe o e-mail do convidado.' });
      res.status(201).json(await convitesService.criarConvite({ email, perfil, contratada }, req.usuario));
    } catch (e) { next(e); }
  },
  async validar(req, res, next) {
    try {
      res.json(await convitesService.validarToken(req.query.token));
    } catch (e) { next(e); }
  },
  async aceitar(req, res, next) {
    try {
      const { token, nome, senha } = req.body;
      if (!token || !nome || !senha) return res.status(400).json({ erro: 'Dados incompletos para o aceite.' });
      if (senha.length < 8) return res.status(400).json({ erro: 'A senha deve ter ao menos 8 caracteres.' });
      res.status(201).json(await convitesService.aceitarConvite({ token, nome, senha }));
    } catch (e) { next(e); }
  },
  async listar(req, res, next) {
    try {
      res.json(await convitesService.listarConvites());
    } catch (e) { next(e); }
  },
};

module.exports = { auth, convites };
