// Definição de rotas da API.
const { Router } = require('express');
const { autenticar, exigirPerfil } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadDocFiscal, uploadEvento } = upload;
const { auth, convites } = require('../controllers/auth.controller');
const relatorios = require('../controllers/relatorios.controller');
const anexos = require('../controllers/anexos.controller');
const solicitacoes = require('../controllers/solicitacoes.controller');
const dosagem = require('../controllers/dosagem.controller');
const notaServico = require('../controllers/notaServico.controller');

const router = Router();

// --- Públicas (aceite de convite e login) ---
router.post('/auth/login', auth.login);
router.post('/auth/esqueci-senha', auth.esqueciSenha);
router.post('/auth/redefinir-senha', auth.redefinirSenha);
router.get('/convites/validar', convites.validar);
router.post('/convites/aceitar', convites.aceitar);

// --- Convites (somente coordenador) ---
router.post('/convites', autenticar, exigirPerfil('COORDENADOR'), convites.criar);
router.get('/convites', autenticar, exigirPerfil('COORDENADOR'), convites.listar);

// --- Relatórios ---
router.get('/relatorios', autenticar, relatorios.listar);
router.post('/relatorios', autenticar, exigirPerfil('USUARIO'), relatorios.criar);
router.get('/relatorios/:id', autenticar, relatorios.detalhar);
router.get('/relatorios/:id/historico', autenticar, relatorios.historico);
// Exclusão lógica (autor ou coordenador)
router.delete('/relatorios/:id', autenticar, relatorios.excluir);

// Ações do usuário convidado
router.post('/relatorios/:id/reenviar', autenticar, exigirPerfil('USUARIO'), relatorios.reenviar);
router.post('/relatorios/:id/observacoes/declarar', autenticar, exigirPerfil('USUARIO'), relatorios.declararObservacoes);

// Ações do coordenador
router.post('/relatorios/:id/aprovar', autenticar, exigirPerfil('COORDENADOR'), upload.single('arquivo'), anexos.aprovar);
router.post('/relatorios/:id/reprovar', autenticar, exigirPerfil('COORDENADOR'), relatorios.reprovar);
router.post('/relatorios/:id/correcao-documental', autenticar, exigirPerfil('COORDENADOR'), relatorios.solicitarCorrecao);
router.post('/relatorios/:id/observacoes', autenticar, exigirPerfil('COORDENADOR'), relatorios.adicionarObservacao);
router.post('/relatorios/:id/observacoes/confirmar', autenticar, exigirPerfil('COORDENADOR'), relatorios.confirmarObservacoes);
router.post('/relatorios/:id/analise-ia', autenticar, exigirPerfil('COORDENADOR'), relatorios.analisarIA);
router.post('/relatorios/:id/analise-ia/decidir', autenticar, exigirPerfil('COORDENADOR'), relatorios.decidirAnaliseIA);
router.post('/relatorios/:id/reabrir', autenticar, exigirPerfil('COORDENADOR'), relatorios.reabrir);

// --- Solicitações gerais ---
router.get('/solicitacoes', autenticar, solicitacoes.listar);
router.post('/solicitacoes', autenticar, solicitacoes.criar);
router.patch('/solicitacoes/:id', autenticar, exigirPerfil('COORDENADOR'), solicitacoes.responder);

// --- Anexos ---
router.post('/relatorios/:id/anexos', autenticar, exigirPerfil('USUARIO'), upload.array('arquivos'), anexos.anexarMedicao);
router.post('/relatorios/:id/documentacao-fiscal', autenticar, exigirPerfil('USUARIO'), uploadDocFiscal.array('arquivos'), anexos.incluirDocumentacaoFiscal);
router.post('/relatorios/:id/atesto', autenticar, exigirPerfil('COORDENADOR'), upload.single('arquivo'), anexos.registrarAtesto);
router.get('/anexos/:id/download', autenticar, anexos.download);

// --- Projetos de dosagem e caracterização de material ---
router.get('/dosagem', autenticar, dosagem.listar);
router.post('/dosagem', autenticar, exigirPerfil('USUARIO'), dosagem.criar);
router.get('/dosagem/:id', autenticar, dosagem.detalhar);
router.patch('/dosagem/:id', autenticar, exigirPerfil('USUARIO'), dosagem.atualizar);
router.delete('/dosagem/:id', autenticar, exigirPerfil('USUARIO'), dosagem.excluir);
router.post('/dosagem/:id/anexos', autenticar, exigirPerfil('USUARIO'), upload.array('arquivos'), dosagem.anexar);
router.get('/dosagem/anexos/:id/download', autenticar, dosagem.download);

// --- Mapa Operacional (notas de serviço por rodovia/km) ---
router.get('/mapa-operacional/rodovias', autenticar, notaServico.rodovias);
router.get('/notas-servico', autenticar, notaServico.listar);
router.post('/notas-servico', autenticar, exigirPerfil('USUARIO'), notaServico.criar);
router.get('/notas-servico/:id', autenticar, notaServico.detalhar);
router.patch('/notas-servico/:id', autenticar, exigirPerfil('USUARIO'), notaServico.atualizar);
router.delete('/notas-servico/:id', autenticar, exigirPerfil('USUARIO'), notaServico.excluir);
router.post('/notas-servico/:id/eventos', autenticar, exigirPerfil('USUARIO'), notaServico.adicionarEvento);
router.post('/notas-servico/eventos/:eventoId/anexos', autenticar, exigirPerfil('USUARIO'), uploadEvento.array('arquivos'), notaServico.anexarEvento);
router.get('/notas-servico/anexos/:id/download', autenticar, notaServico.download);

module.exports = router;
