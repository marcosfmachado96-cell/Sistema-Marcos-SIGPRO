// Análise por IA do relatório de medição.
// - Extrai o texto do(s) PDF(s) de MEDIÇÃO (nunca da documentação fiscal).
// - Injeta no prompt as "diretrizes aprendidas" (erros confirmados pelo
//   coordenador e sugestões rejeitadas) — aprendizado por contexto.
// - Chama a API da Anthropic se houver ANTHROPIC_API_KEY; caso contrário,
//   devolve uma simulação para que o fluxo seja testável sem chave.
//
// Importante: não há retreinamento de modelo. O "aprendizado contínuo" é feito
// acumulando diretrizes e injetando-as no contexto das próximas análises.

const pdfParse = require('pdf-parse');
const prisma = require('./prisma');
const storage = require('./storage');
const env = require('../config/env');

const fmtMoeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// Extrai o texto dos anexos de MEDIÇÃO em PDF (limitado para caber no prompt).
async function extrairTextoRelatorio(relatorioId) {
  const anexos = await prisma.anexo.findMany({
    where: { relatorioId, categoria: 'MEDICAO', contentType: 'application/pdf' },
  });
  let texto = '';
  for (const a of anexos) {
    try {
      const buf = await storage.obterBuffer(a.chaveS3);
      const r = await pdfParse(buf);
      texto += `\n--- ${a.nomeArquivo} ---\n${r.text}\n`;
    } catch (e) {
      texto += `\n--- ${a.nomeArquivo} (falha ao ler: ${e.message}) ---\n`;
    }
  }
  return texto.slice(0, 60000); // teto de segurança
}

// Diretrizes acumuladas a partir do feedback do coordenador.
async function diretrizesAprendidas() {
  const ds = await prisma.aprendizadoIA.findMany({ orderBy: { criadoEm: 'desc' }, take: 40 });
  if (ds.length === 0) return '';
  return ds.map((d, i) => `${i + 1}. ${d.diretriz}`).join('\n');
}

function montarPrompt(relatorio, textoPdf, diretrizes) {
  return `Você é um analista de fiscalização de obras públicas (DER/PR). Analise o
relatório de medição abaixo e aponte possíveis inconsistências, erros ou pontos
que o coordenador deveria verificar antes de aprovar. Seja objetivo e técnico.

DADOS DO RELATÓRIO:
- Nº da medição: ${relatorio.numMedicao}
- Contrato: ${relatorio.contrato}
- Objeto: ${relatorio.objeto}
- Período: ${fmtData(relatorio.periodoInicio)} a ${fmtData(relatorio.periodoFim)}
- Valor declarado: ${fmtMoeda(relatorio.valor)}

CONTEÚDO EXTRAÍDO DO PDF DO RELATÓRIO:
${textoPdf || '(sem texto extraído)'}

${diretrizes ? `DIRETRIZES APRENDIDAS (priorize estes pontos, vêm de correções anteriores do coordenador):\n${diretrizes}\n` : ''}
Responda SOMENTE com um objeto JSON válido, sem markdown, no formato:
{"resumo": "string curta", "itens": [{"texto": "consideração objetiva", "severidade": "baixa|media|alta"}]}
Liste de 0 a 8 itens. Se não houver inconsistências, devolva itens vazio.`;
}

// Chama a API da Anthropic. Lança em caso de erro de rede/credencial.
async function chamarAnthropic(prompt) {
  const resp = await fetch(`${env.ia.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ia.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ia.modelo,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    const e = new Error(`Falha na API de IA (${resp.status}): ${t.slice(0, 200)}`);
    e.status = 502;
    throw e;
  }
  const data = await resp.json();
  const texto = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return texto;
}

function parseJson(texto) {
  const limpo = texto.replace(/```json|```/g, '').trim();
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini === -1 || fim === -1) throw new Error('Resposta da IA sem JSON.');
  return JSON.parse(limpo.slice(ini, fim + 1));
}

// Simulação usada quando não há chave de API configurada.
function simulacao(relatorio, textoPdf) {
  const itens = [];
  if (!textoPdf) {
    itens.push({ texto: 'Não foi possível extrair texto do PDF do relatório; verifique se o anexo é um PDF legível (não digitalizado como imagem).', severidade: 'media' });
  }
  itens.push({ texto: `Conferir se o valor declarado (${fmtMoeda(relatorio.valor)}) corresponde aos quantitativos e preços unitários do contrato ${relatorio.contrato}.`, severidade: 'media' });
  itens.push({ texto: 'Verificar se o período da medição não se sobrepõe a medições anteriores do mesmo contrato.', severidade: 'baixa' });
  return { resumo: '[Simulação — sem chave de IA configurada] Pontos de verificação sugeridos.', itens, modelo: 'simulacao' };
}

// Executa a análise e devolve { resumo, itens, modelo }.
async function analisar(relatorio) {
  const textoPdf = await extrairTextoRelatorio(relatorio.id);

  if (!env.ia.apiKey) {
    return simulacao(relatorio, textoPdf);
  }
  const diretrizes = await diretrizesAprendidas();
  const prompt = montarPrompt(relatorio, textoPdf, diretrizes);
  const respostaTexto = await chamarAnthropic(prompt);
  const parsed = parseJson(respostaTexto);
  return {
    resumo: parsed.resumo || '',
    itens: Array.isArray(parsed.itens) ? parsed.itens : [],
    modelo: env.ia.modelo,
  };
}

// Registra uma diretriz aprendida (chamado quando o coordenador confirma um erro
// ou rejeita uma sugestão da IA).
async function registrarAprendizado(diretriz, origem, tx) {
  const client = tx || prisma;
  if (!diretriz || !diretriz.trim()) return;
  await client.aprendizadoIA.create({ data: { diretriz: diretriz.trim().slice(0, 500), origem } });
}

module.exports = { analisar, registrarAprendizado };
