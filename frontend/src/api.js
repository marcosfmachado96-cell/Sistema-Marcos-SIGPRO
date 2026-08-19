// Cliente da API. Anexa o token JWT e centraliza o tratamento de erro.

const BASE = import.meta.env.VITE_API_URL || '/api';

// Token e usuário ficam no localStorage ("lembrar-me") ou no sessionStorage
// (some ao fechar o navegador), conforme escolhido no login.
let token = localStorage.getItem('token') || sessionStorage.getItem('token') || null;

export function definirToken(t, lembrar) {
  token = t;
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  if (t) (lembrar ? localStorage : sessionStorage).setItem('token', t);
}

// Callback acionado quando uma requisição autenticada volta com 401
// (sessão expirada/token inválido) — usado para encerrar a sessão e
// devolver o usuário ao login em vez de mostrar o erro técnico na tela.
let aoSessaoExpirar = null;
export function definirAoSessaoExpirar(fn) {
  aoSessaoExpirar = fn;
}

async function req(metodo, caminho, corpo, ehFormData) {
  const headers = {};
  const autenticada = !!token;
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (ehFormData) {
    body = corpo; // FormData: o navegador define o Content-Type com boundary
  } else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  const resp = await fetch(`${BASE}${caminho}`, { method: metodo, headers, body });

  if (resp.status === 401 && autenticada && aoSessaoExpirar) aoSessaoExpirar();

  if (resp.status === 204) return null;
  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resp.ok) {
    const err = new Error((dados && dados.erro) || `Erro ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return dados;
}

export const api = {
  // Autenticação / convites
  login: (email, senha) => req('POST', '/auth/login', { email, senha }),
  esqueciSenha: (email) => req('POST', '/auth/esqueci-senha', { email }),
  redefinirSenha: (token, senha) => req('POST', '/auth/redefinir-senha', { token, senha }),
  validarConvite: (t) => req('GET', `/convites/validar?token=${encodeURIComponent(t)}`),
  aceitarConvite: (t, nome, senha) => req('POST', '/convites/aceitar', { token: t, nome, senha }),
  convidar: (dados) => req('POST', '/convites', dados),
  listarConvites: () => req('GET', '/convites'),

  // Solicitações gerais
  listarSolicitacoes: () => req('GET', '/solicitacoes'),
  criarSolicitacao: (dados) => req('POST', '/solicitacoes', dados),
  responderSolicitacao: (id, dados) => req('PATCH', `/solicitacoes/${id}`, dados),

  // Relatórios
  listarRelatorios: (filtros = {}) => {
    const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    return req('GET', `/relatorios${qs ? `?${qs}` : ''}`);
  },
  criarRelatorio: (dados) => req('POST', '/relatorios', dados),
  detalhar: (id) => req('GET', `/relatorios/${id}`),
  historico: (id) => req('GET', `/relatorios/${id}/historico`),
  excluirRelatorio: (id) => req('DELETE', `/relatorios/${id}`),

  // Aprovação exige o relatório assinado (multipart, campo 'arquivo') e já conclui o relatório.
  aprovar: (id, arquivo) => req('POST', `/relatorios/${id}/aprovar`, formData({ arquivo }), true),
  // Reprovação recebe uma lista de observações numeradas.
  reprovar: (id, itens) => req('POST', `/relatorios/${id}/reprovar`, { itens }),
  reenviar: (id, dados) => req('POST', `/relatorios/${id}/reenviar`, dados),
  reabrir: (id, texto) => req('POST', `/relatorios/${id}/reabrir`, { texto }),

  // Observações
  adicionarObservacao: (id, texto, tipo) => req('POST', `/relatorios/${id}/observacoes`, { texto, tipo }),
  declararObservacoes: (id, itens) => req('POST', `/relatorios/${id}/observacoes/declarar`, { itens }),
  confirmarObservacoes: (id, itens) => req('POST', `/relatorios/${id}/observacoes/confirmar`, { itens }),

  // Análise por IA
  analisarIA: (id) => req('POST', `/relatorios/${id}/analise-ia`),
  decidirAnaliseIA: (id, decisoes) => req('POST', `/relatorios/${id}/analise-ia/decidir`, { decisoes }),

  // Anexos (multipart). `descricoes` (opcional) é alinhado por índice com `arquivos`
  // — obrigatório para planilhas (xlsx/xls), que exigem um rótulo do conteúdo.
  anexarMedicao: (id, arquivos, descricoes) =>
    req('POST', `/relatorios/${id}/anexos`, formData({ arquivos, descricoes }), true),

  // Download autenticado: busca com o token e salva o arquivo via blob.
  baixarAnexo: async (anexoId, nomeArquivo) => {
    const resp = await fetch(`${BASE}/anexos/${anexoId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error('Falha ao baixar o anexo.');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo || 'anexo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Projetos de dosagem e caracterização de material
  listarDosagem: () => req('GET', '/dosagem'),
  criarDosagem: (dados) => req('POST', '/dosagem', dados),
  detalharDosagem: (id) => req('GET', `/dosagem/${id}`),
  atualizarDosagem: (id, dados) => req('PATCH', `/dosagem/${id}`, dados),
  excluirDosagem: (id) => req('DELETE', `/dosagem/${id}`),
  anexarDosagem: (id, arquivos) => req('POST', `/dosagem/${id}/anexos`, formData({ arquivos }), true),
  baixarAnexoDosagem: async (anexoId, nomeArquivo) => {
    const resp = await fetch(`${BASE}/dosagem/anexos/${anexoId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error('Falha ao baixar o anexo.');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo || 'anexo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Mapa Operacional — notas de serviço por rodovia/km e histórico de eventos
  rodoviasMapa: () => req('GET', '/mapa-operacional/rodovias'),
  listarNotasServico: () => req('GET', '/notas-servico'),
  criarNotaServico: (dados) => req('POST', '/notas-servico', dados),
  detalharNotaServico: (id) => req('GET', `/notas-servico/${id}`),
  atualizarNotaServico: (id, dados) => req('PATCH', `/notas-servico/${id}`, dados),
  excluirNotaServico: (id) => req('DELETE', `/notas-servico/${id}`),
  adicionarEventoNota: (id, dados) => req('POST', `/notas-servico/${id}/eventos`, dados),
  anexarEventoNota: (eventoId, arquivos) =>
    req('POST', `/notas-servico/eventos/${eventoId}/anexos`, formData({ arquivos }), true),
  baixarAnexoEventoNota: async (anexoId, nomeArquivo) => {
    const resp = await fetch(`${BASE}/notas-servico/anexos/${anexoId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error('Falha ao baixar o anexo.');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo || 'anexo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

function formData({ arquivos, arquivo, observacoes, descricoes }) {
  const fd = new FormData();
  if (arquivos) for (const f of arquivos) fd.append('arquivos', f);
  if (arquivo) fd.append('arquivo', arquivo);
  if (observacoes != null) fd.append('observacoes', observacoes);
  if (descricoes) fd.append('descricoes', JSON.stringify(descricoes));
  return fd;
}
