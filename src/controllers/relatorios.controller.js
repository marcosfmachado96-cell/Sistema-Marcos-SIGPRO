// Controller de relatórios — traduz requisições HTTP em ações de domínio.
const service = require('../services/relatorios.service');

module.exports = {
  async criar(req, res, next) {
    try {
      const { numMedicao, periodoInicio, periodoFim, contrato, objeto, valor } = req.body;
      if (!numMedicao || !periodoInicio || !periodoFim || !contrato || !objeto || valor == null) {
        return res.status(400).json({ erro: 'Campos obrigatórios da medição ausentes.' });
      }
      res.status(201).json(await service.criar(req.body, req.usuario));
    } catch (e) { next(e); }
  },

  async listar(req, res, next) {
    try { res.json(await service.listar(req.usuario, req.query)); } catch (e) { next(e); }
  },
  async detalhar(req, res, next) {
    try { res.json(await service.detalhar(req.params.id, req.usuario)); } catch (e) { next(e); }
  },
  async historico(req, res, next) {
    try { res.json(await service.historico(req.params.id, req.usuario)); } catch (e) { next(e); }
  },

  // Reprovação e correção documental recebem uma lista de observações numeradas.
  async reprovar(req, res, next) {
    try { res.json(await service.reprovar(req.params.id, req.body.itens, req.usuario)); } catch (e) { next(e); }
  },
  async solicitarCorrecao(req, res, next) {
    try { res.json(await service.solicitarCorrecao(req.params.id, req.body.itens, req.usuario)); } catch (e) { next(e); }
  },

  async reenviar(req, res, next) {
    try { res.json(await service.reenviar(req.params.id, req.body, req.usuario)); } catch (e) { next(e); }
  },

  // Observações
  async adicionarObservacao(req, res, next) {
    try { res.status(201).json(await service.adicionarObservacao(req.params.id, req.body.texto, req.body.tipo, req.usuario)); } catch (e) { next(e); }
  },
  async declararObservacoes(req, res, next) {
    try { res.json(await service.declararObservacoes(req.params.id, req.body.itens, req.usuario)); } catch (e) { next(e); }
  },
  async confirmarObservacoes(req, res, next) {
    try { res.json(await service.confirmarObservacoes(req.params.id, req.body.itens, req.usuario)); } catch (e) { next(e); }
  },

  // Exclusão lógica
  async excluir(req, res, next) {
    try { res.json(await service.excluir(req.params.id, req.usuario)); } catch (e) { next(e); }
  },

  // Análise por IA
  async analisarIA(req, res, next) {
    try { res.json(await service.analisarIA(req.params.id, req.usuario)); } catch (e) { next(e); }
  },
  async decidirAnaliseIA(req, res, next) {
    try { res.json(await service.decidirAnaliseItens(req.params.id, req.body.decisoes, req.usuario)); } catch (e) { next(e); }
  },
};
