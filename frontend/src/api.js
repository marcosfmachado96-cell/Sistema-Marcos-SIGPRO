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

  // Aprovação exige o relatório assinado (multipart, campo 'arquivo').
  aprovar: (id, arquivo) => req('POST', `/relatorios/${id}/aprovar`, formData({ arquivo }), true),
  // Reprovação e correção recebem uma lista de observações numeradas.
  reprovar: (id, itens) => req('POST', `/relatorios/${id}/reprovar`, { itens }),
  correcaoDocumental: (id, itens) => req('POST', `/relatorios/${id}/correcao-documental`, { itens }),
  reenviar: (id, dados) => req('POST', `/relatorios/${id}/reenviar`, dados),

  // Observações
  adicionarObservacao: (id, texto, tipo) => req('POST', `/relatorios/${id}/observacoes`, { texto, tipo }),
  declararObservacoes: (id, itens) => req('POST', `/relatorios/${id}/observacoes/declarar`, { itens }),
  confirmarObservacoes: (id, itens) => req('POST', `/relatorios/${id}/observacoes/confirmar`, { itens }),

  // Análise por IA
  analisarIA: (id) => req('POST', `/relatorios/${id}/analise-ia`),
  decidirAnaliseIA: (id, decisoes) => req('POST', `/relatorios/${id}/analise-ia/decidir`, { decisoes }),

  // Anexos (multipart)
  anexarMedicao: (id, arquivos) => req('POST', `/relatorios/${id}/anexos`, formData({ arquivos }), true),
  incluirDocFiscal: (id, arquivos) => req('POST', `/relatorios/${id}/documentacao-fiscal`, formData({ arquivos }), true),
  registrarAtesto: (id, arquivo, observacoes) =>
    req('POST', `/relatorios/${id}/atesto`, formData({ arquivo, observacoes }), true),

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
};

function formData({ arquivos, arquivo, observacoes }) {
  const fd = new FormData();
  if (arquivos) for (const f of arquivos) fd.append('arquivos', f);
  if (arquivo) fd.append('arquivo', arquivo);
  if (observacoes != null) fd.append('observacoes', observacoes);
  return fd;
}
