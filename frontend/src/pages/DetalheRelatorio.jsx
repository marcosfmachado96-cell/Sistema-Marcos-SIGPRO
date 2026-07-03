import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Pipeline, StatusBadge } from '../components/Pipeline';
import { ROTULOS } from '../estados';
import { fmtMoeda, fmtPeriodo, fmtDataHora, ehPlanilha } from '../util';

export function DetalheRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ehCoordenador } = useAuth();

  const [rel, setRel] = useState(null);
  const [hist, setHist] = useState([]);
  const [erro, setErro] = useState('');
  const [acaoErro, setAcaoErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(() => {
    Promise.all([api.detalhar(id), api.historico(id)])
      .then(([r, h]) => { setRel(r); setHist(h); })
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function acao(fn) {
    setAcaoErro(''); setOcupado(true);
    try { await fn(); carregar(); }
    catch (e) { setAcaoErro(e.message); }
    finally { setOcupado(false); }
  }

  async function excluir() {
    if (!window.confirm('Excluir este relatório? O card sai da lista, mas o registro e o histórico ficam preservados para eventual recuperação.')) return;
    setAcaoErro(''); setOcupado(true);
    try { await api.excluirRelatorio(id); navigate(ehCoordenador ? '/coordenador' : '/relatorios'); }
    catch (e) { setAcaoErro(e.message); setOcupado(false); }
  }

  if (erro) return <div className="alerta alerta-erro">{erro}</div>;
  if (!rel) return <div className="carregando">Carregando relatório…</div>;

  const podeExcluir = ehCoordenador;
  const anexosPorCat = (cat) => (rel.anexos || []).filter((a) => a.categoria === cat);

  // Data em que cada etapa da trilha foi atingida (a partir do histórico).
  const datasTrilha = { ENVIADO: rel.criadoEm };
  for (const l of hist) {
    if (l.estadoPara && !datasTrilha[l.estadoPara]) datasTrilha[l.estadoPara] = l.criadoEm;
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Medição Nº {rel.numMedicao} · {rel.contrato}</div>
          <h1>{rel.objeto}</h1>
          <div className="descricao">{rel.autor?.nome}{rel.autor?.contratada ? ` · ${rel.autor.contratada}` : ''}</div>
        </div>
        <div className="row">
          {podeExcluir && rel.estado !== 'CONCLUIDO' && (
            <button className="btn btn-reprovar" disabled={ocupado} onClick={excluir}>Excluir</button>
          )}
          <button className="btn btn-secundario" onClick={() => navigate(ehCoordenador ? '/coordenador' : '/relatorios')}>Voltar</button>
        </div>
      </div>

      <Pipeline estado={rel.estado} versao={rel.versaoAtual} datas={datasTrilha} />

      <div className="card card-pad meta-cards" style={{ marginTop: 16 }}>
        <MetaCard icone="doc" titulo="Nº da medição" valor={rel.numMedicao} mono />
        <MetaCard icone="folder" titulo="Contrato" valor={rel.contrato} />
        <MetaCard icone="cal" titulo="Período" valor={fmtPeriodo(rel.periodoInicio, rel.periodoFim)} />
        <MetaCard icone="cash" titulo="Valor" valor={fmtMoeda(rel.valor)} mono />
      </div>

      {acaoErro && <div className="alerta alerta-erro" style={{ marginTop: 16 }}>{acaoErro}</div>}

      <PainelAcao rel={rel} ehCoordenador={ehCoordenador} ocupado={ocupado} acao={acao} />

      <Observacoes rel={rel} ehCoordenador={ehCoordenador} ocupado={ocupado} acao={acao} />

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Anexos</h3>
        <GrupoAnexos titulo="Medição" itens={anexosPorCat('MEDICAO')} />
        <GrupoAnexos titulo="Relatório assinado" itens={anexosPorCat('RELATORIO_ASSINADO')} />
        <GrupoAnexos titulo="Documentação fiscal" itens={anexosPorCat('DOC_FISCAL')} />
        <GrupoAnexos titulo="Atesto" itens={anexosPorCat('ATESTO')} />
        {(rel.anexos || []).length === 0 && <p className="descricao">Nenhum anexo.</p>}
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Histórico e auditoria</h3>
        <ul className="timeline">
          {hist.map((l) => (
            <li key={l.id}>
              <div className="tl-acao">{rotuloAcao(l)}</div>
              <div className="tl-meta">
                {l.ator?.nome} · {fmtDataHora(l.criadoEm)}
                {l.estadoDe && l.estadoPara ? ` · ${ROTULOS[l.estadoDe]} → ${ROTULOS[l.estadoPara]}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

const META_ICONES = {
  doc: ['M6 3h9l3 3v15H6z', 'M15 3v3h3'],
  folder: ['M4 6h6l2 2h8v11H4z'],
  cal: ['M4 5h16v15H4z', 'M4 9h16', 'M8 3v4', 'M16 3v4'],
  cash: ['M3 6h18v12H3z', 'M7 12h.01', 'M17 12h.01', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
};
function MetaCard({ icone, titulo, valor, mono }) {
  return (
    <div className="meta-card">
      <div className="meta-ic">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {(META_ICONES[icone] || []).map((p, i) => <path key={i} d={p} />)}
        </svg>
      </div>
      <div>
        <div className="meta-rot">{titulo}</div>
        <div className={`meta-val ${mono ? 'mono' : ''}`}>{valor}</div>
      </div>
    </div>
  );
}

function GrupoAnexos({ titulo, itens }) {
  if (!itens || itens.length === 0) return null;
  return (
    <ul className="lista-anexos">
      {itens.map((a) => (
        <li key={a.id}>
          <span className="tag-categoria">{titulo}</span>
          <button className="link-anexo" onClick={() => api.baixarAnexo(a.id, a.nomeArquivo)}>{a.nomeArquivo}</button>
          {a.descricao && <span className="descricao"> — {a.descricao}</span>}
        </li>
      ))}
    </ul>
  );
}

function rotuloAcao(l) {
  const m = {
    CRIAR: 'Relatório criado', ENVIAR_PARA_ANALISE: 'Enviado para análise',
    APROVAR: 'Medição aprovada', REPROVAR: 'Medição reprovada', REENVIAR: 'Relatório reenviado',
    ANEXAR_MEDICAO: 'Anexos de medição incluídos', ANEXAR_DOC_FISCAL: 'Documentação fiscal incluída',
    REENVIAR_DOCUMENTOS: 'Documentos contábeis reenviados', SOLICITAR_CORRECAO_DOCUMENTAL: 'Correção documental solicitada',
    INSERIR_ATESTO: 'Atesto contábil inserido', ACEITAR_CONVITE: 'Acesso ativado',
    ADICIONAR_OBSERVACAO: 'Observação adicionada', DECLARAR_OBSERVACOES: 'Colaborador declarou observações',
    CONFIRMAR_OBSERVACOES: 'Coordenador confirmou observações', EXCLUIR_RELATORIO: 'Relatório excluído',
    ANALISE_IA: 'Análise por IA executada', DECIDIR_ANALISE_IA: 'Decisão sobre a análise da IA',
    REABRIR: 'Processo reaberto pelo coordenador',
  };
  return m[l.acao] || l.acao;
}

// ---------------------------------------------------------------------------
// Observações numeradas — colaborador declara, coordenador confirma.
// ---------------------------------------------------------------------------
function Observacoes({ rel, ehCoordenador, ocupado, acao }) {
  // REABERTURA é uma justificativa de auditoria (já aparece no Histórico), não
  // um item numerado do fluxo declarar/confirmar do colaborador/coordenador.
  const obs = (rel.observacoes || []).filter((o) => o.tipo !== 'REABERTURA');
  const [decl, setDecl] = useState({});      // colaborador: { [id]: {status, declaracao} }
  const [conf, setConf] = useState({});      // coordenador: { [id]: confirmacao }
  const [novaObs, setNovaObs] = useState('');

  if (obs.length === 0 && !(ehCoordenador && ['EM_ANALISE', 'AGUARDANDO_ATESTO'].includes(rel.estado))) return null;

  const colaboradorPodeDeclarar = !ehCoordenador && ['REPROVADO', 'CORRECAO_DOCUMENTAL'].includes(rel.estado);
  const coordenadorPodeConfirmar = ehCoordenador && ['EM_ANALISE', 'AGUARDANDO_ATESTO'].includes(rel.estado);

  function salvarDeclaracoes() {
    const itens = Object.entries(decl).map(([id, v]) => ({ id, status: v.status, declaracao: v.declaracao }));
    if (itens.length === 0) return;
    acao(() => api.declararObservacoes(rel.id, itens));
  }
  function salvarConfirmacoes() {
    const itens = Object.entries(conf).map(([id, c]) => ({ id, confirmacao: c }));
    if (itens.length === 0) return;
    acao(() => api.confirmarObservacoes(rel.id, itens));
  }

  const statusLabel = { PENDENTE: 'Pendente', ATENDIDO: 'Atendido', NAO_ATENDIDO: 'Não atendido' };
  const confLabel = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', REABERTO: 'Reaberto' };

  if (obs.length === 0 && coordenadorPodeConfirmar) {
    // só o campo de adicionar observação avulsa
    return (
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Observações</h3>
        <p className="descricao" style={{ marginBottom: 10 }}>Nenhuma observação ainda.</p>
        <CampoAddObs novaObs={novaObs} setNovaObs={setNovaObs} ocupado={ocupado}
          onAdd={() => acao(() => api.adicionarObservacao(rel.id, novaObs)).then(() => setNovaObs(''))} />
      </div>
    );
  }
  if (obs.length === 0) return null;

  return (
    <div className="card card-pad" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Observações do coordenador</h3>
      {obs.map((o) => {
        const d = decl[o.id] || { status: o.statusColaborador, declaracao: o.declaracao || '' };
        const confirmada = o.statusColaborador === 'ATENDIDO' && o.confirmacao === 'CONFIRMADO';
        const classeCor = confirmada ? 'confirmada' : (o.tipo === 'REPROVACAO_MEDICAO' ? 'reprovacao' : '');
        return (
          <div key={o.id} className={`obs-item ${classeCor}`}>
            <div className="obs-cab">
              <b>#{o.numero}</b>{o.origem === 'IA' ? ' · IA' : ''} · {o.tipo === 'REPROVACAO_MEDICAO' ? 'Medição' : 'Documental'}
              {' · '}<span className="tag-status">{statusLabel[o.statusColaborador]}</span>
              {o.confirmacao !== 'PENDENTE' ? <> · <span className="tag-status">{confLabel[o.confirmacao]}</span></> : null}
            </div>
            <div>{o.texto}</div>
            {o.declaracao && <div className="descricao" style={{ marginTop: 4 }}>Colaborador: {o.declaracao}</div>}

            {colaboradorPodeDeclarar && (
              <div className="row" style={{ marginTop: 8 }}>
                <select className="input" style={{ maxWidth: 170 }} value={d.status}
                  onChange={(e) => setDecl({ ...decl, [o.id]: { ...d, status: e.target.value } })}>
                  <option value="PENDENTE">Pendente</option>
                  <option value="ATENDIDO">Atendido</option>
                  <option value="NAO_ATENDIDO">Não atendido</option>
                </select>
                <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Comentário (opcional)"
                  value={d.declaracao} onChange={(e) => setDecl({ ...decl, [o.id]: { ...d, declaracao: e.target.value } })} />
              </div>
            )}

            {coordenadorPodeConfirmar && o.statusColaborador !== 'PENDENTE' && (
              <div className="row" style={{ marginTop: 8 }}>
                <span className="descricao">Confirmar:</span>
                <select className="input" style={{ maxWidth: 170 }} value={conf[o.id] || o.confirmacao}
                  onChange={(e) => setConf({ ...conf, [o.id]: e.target.value })}>
                  <option value="PENDENTE">Pendente</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="REABERTO">Reabrir</option>
                </select>
              </div>
            )}
          </div>
        );
      })}

      {colaboradorPodeDeclarar && (
        <div className="row row-fim" style={{ marginTop: 8 }}>
          <button className="btn btn-primario" disabled={ocupado} onClick={salvarDeclaracoes}>Salvar declarações</button>
        </div>
      )}
      {coordenadorPodeConfirmar && (
        <>
          <div className="row row-fim" style={{ marginTop: 8 }}>
            <button className="btn btn-primario" disabled={ocupado} onClick={salvarConfirmacoes}>Salvar confirmações</button>
          </div>
          <hr className="divisor" />
          <CampoAddObs novaObs={novaObs} setNovaObs={setNovaObs} ocupado={ocupado}
            onAdd={() => acao(() => api.adicionarObservacao(rel.id, novaObs)).then(() => setNovaObs(''))} />
        </>
      )}
    </div>
  );
}

function CampoAddObs({ novaObs, setNovaObs, onAdd, ocupado }) {
  return (
    <div>
      <label style={{ fontWeight: 600, fontSize: 13 }}>Adicionar observação</label>
      <div className="row" style={{ marginTop: 6 }}>
        <input className="input" style={{ flex: 1 }} value={novaObs} onChange={(e) => setNovaObs(e.target.value)} placeholder="Nova observação numerada…" />
        <button className="btn btn-secundario" disabled={ocupado || !novaObs.trim()} onClick={onAdd}>Adicionar</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de ação — varia conforme estado e perfil.
// ---------------------------------------------------------------------------
function PainelAcao({ rel, ehCoordenador, ocupado, acao }) {
  const e = rel.estado;
  const [arquivos, setArquivos] = useState([]);
  const [revArquivos, setRevArquivos] = useState([]);
  const [revDescricoes, setRevDescricoes] = useState({}); // { [indice]: texto }
  const [revErro, setRevErro] = useState('');
  const [assinado, setAssinado] = useState(null);
  const [atestoArquivo, setAtestoArquivo] = useState(null);
  const [atestoObs, setAtestoObs] = useState('');
  const [obsLinhas, setObsLinhas] = useState(['']);
  const [corrLinhas, setCorrLinhas] = useState(['']);
  const [analisando, setAnalisando] = useState(false);
  const [reabrirTexto, setReabrirTexto] = useState('');
  const analise = (rel.analises && rel.analises[0]) || null;

  function setLinha(arr, set, i, v) { const c = [...arr]; c[i] = v; set(c); }
  function addLinha(arr, set) { set([...arr, '']); }
  function rmLinha(arr, set, i) { set(arr.filter((_, j) => j !== i)); }

  async function analisarIA() {
    setAnalisando(true);
    try { await api.analisarIA(rel.id); }
    finally { setAnalisando(false); }
    acao(() => Promise.resolve()); // recarrega
  }
  function aceitarItemIA(item) {
    api.decidirAnaliseIA(rel.id, [{ itemId: item.id, aceito: true }]).catch(() => {});
    setObsLinhas((l) => [...l.filter((x) => x.trim()), item.texto]);
  }
  function rejeitarItemIA(item) {
    api.decidirAnaliseIA(rel.id, [{ itemId: item.id, aceito: false }]).catch(() => {});
    acao(() => Promise.resolve());
  }

  // ---- Coordenador: análise (IA + aprovar com assinatura + reprovar) ----
  if (ehCoordenador && e === 'EM_ANALISE') {
    const itensReprovar = obsLinhas.filter((x) => x.trim()).map((t) => ({ texto: t, origem: 'COORDENADOR' }));
    return (
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Análise da medição</h3>

        {/* IA */}
        <div className="alerta alerta-info" style={{ marginBottom: 14 }}>
          <div className="entre">
            <span>Análise automática por IA do relatório (não inclui documentação fiscal).</span>
            <button className="btn btn-secundario" disabled={analisando || ocupado} onClick={analisarIA}>
              {analisando ? 'Analisando…' : 'Analisar com IA'}
            </button>
          </div>
          {analise && (
            <div style={{ marginTop: 12 }}>
              {analise.modelo === 'simulacao' && <div className="descricao" style={{ marginBottom: 6 }}>Modo simulação (sem chave de IA configurada).</div>}
              {analise.resumo && <div style={{ marginBottom: 8 }}>{analise.resumo}</div>}
              {(analise.itens || []).map((it) => (
                <div key={it.id} className="obs-item" style={{ background: 'var(--superficie-2)', borderLeftColor: 'var(--azul)' }}>
                  <div className="obs-cab">#{it.numero}{it.severidade ? ` · ${it.severidade}` : ''}{it.aceito === true ? ' · aceito' : it.aceito === false ? ' · rejeitado' : ''}</div>
                  <div>{it.texto}</div>
                  {it.aceito == null && (
                    <div className="row" style={{ marginTop: 6 }}>
                      <button className="btn btn-aprovar" disabled={ocupado} onClick={() => aceitarItemIA(it)}>Aceitar</button>
                      <button className="btn btn-secundario" disabled={ocupado} onClick={() => rejeitarItemIA(it)}>Rejeitar</button>
                    </div>
                  )}
                </div>
              ))}
              {(analise.itens || []).length === 0 && <div className="descricao">A IA não apontou inconsistências.</div>}
            </div>
          )}
        </div>

        {/* Reprovar com observações numeradas */}
        <div className="campo">
          <label>Observações da reprovação <span className="dica">(numeradas; as aceitas da IA entram aqui)</span></label>
          {obsLinhas.map((l, i) => (
            <div key={i} className="row" style={{ marginBottom: 6 }}>
              <span className="mono" style={{ width: 22 }}>{i + 1}.</span>
              <input className="input" style={{ flex: 1 }} value={l} onChange={(ev) => setLinha(obsLinhas, setObsLinhas, i, ev.target.value)} placeholder="Descreva a correção necessária…" />
              {obsLinhas.length > 1 && <button className="btn btn-secundario" onClick={() => rmLinha(obsLinhas, setObsLinhas, i)}>×</button>}
            </div>
          ))}
          <button className="btn btn-secundario" onClick={() => addLinha(obsLinhas, setObsLinhas)}>+ observação</button>
        </div>

        <hr className="divisor" />

        {/* Aprovar com relatório assinado */}
        <div className="campo">
          <label>Relatório assinado <span className="dica">(obrigatório para aprovar)</span></label>
          <div className="dropzone">
            Anexar o relatório assinado (PDF)
            <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(ev) => setAssinado(ev.target.files[0] || null)} />
          </div>
        </div>

        <div className="row row-fim">
          <button className="btn btn-reprovar" disabled={ocupado || itensReprovar.length === 0}
            onClick={() => acao(() => api.reprovar(rel.id, itensReprovar))}>Reprovar</button>
          <button className="btn btn-aprovar" disabled={ocupado || !assinado}
            onClick={() => acao(() => api.aprovar(rel.id, assinado))}>Aprovar medição</button>
        </div>
      </div>
    );
  }

  // ---- Coordenador: atesto / correção documental ----
  if (ehCoordenador && e === 'AGUARDANDO_ATESTO') {
    const itensCorr = corrLinhas.filter((x) => x.trim()).map((t) => ({ texto: t, origem: 'COORDENADOR' }));
    return (
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Atesto contábil</h3>
        <p className="descricao" style={{ marginBottom: 14 }}>Insira o atesto para concluir, ou solicite correção dos documentos contábeis.</p>
        <div className="campo">
          <label>Documento do atesto <span className="dica">(opcional)</span></label>
          <div className="dropzone">Anexar o atesto<input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(ev) => setAtestoArquivo(ev.target.files[0] || null)} /></div>
        </div>
        <div className="campo">
          <label>Observações do atesto <span className="dica">(opcional)</span></label>
          <textarea className="textarea" value={atestoObs} onChange={(ev) => setAtestoObs(ev.target.value)} />
        </div>
        <hr className="divisor" />
        <div className="campo">
          <label>Ou solicite correção documental <span className="dica">(observações numeradas)</span></label>
          {corrLinhas.map((l, i) => (
            <div key={i} className="row" style={{ marginBottom: 6 }}>
              <span className="mono" style={{ width: 22 }}>{i + 1}.</span>
              <input className="input" style={{ flex: 1 }} value={l} onChange={(ev) => setLinha(corrLinhas, setCorrLinhas, i, ev.target.value)} placeholder="O que precisa ser corrigido…" />
              {corrLinhas.length > 1 && <button className="btn btn-secundario" onClick={() => rmLinha(corrLinhas, setCorrLinhas, i)}>×</button>}
            </div>
          ))}
          <button className="btn btn-secundario" onClick={() => addLinha(corrLinhas, setCorrLinhas)}>+ observação</button>
        </div>
        <div className="row row-fim">
          <button className="btn btn-secundario" disabled={ocupado || itensCorr.length === 0}
            onClick={() => acao(() => api.correcaoDocumental(rel.id, itensCorr))}>Solicitar correção</button>
          <button className="btn btn-ambar" disabled={ocupado}
            onClick={() => acao(() => api.registrarAtesto(rel.id, atestoArquivo, atestoObs))}>Inserir atesto e concluir</button>
        </div>
      </div>
    );
  }

  // ---- Colaborador: reenvio após reprovação ----
  if (!ehCoordenador && e === 'REPROVADO') {
    return (
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Ajustar e reenviar</h3>
        <p className="descricao" style={{ marginBottom: 14 }}>
          Declare cada observação acima como atendida ou não atendida e salve. Selecione o relatório
          revisado e reenvie — uma nova versão é criada, o anexo é incluído nela e o relatório volta
          para análise.
        </p>
        <div className="campo">
          <label>Relatório revisado <span className="dica">(PDF; anexe a versão corrigida)</span></label>
          <div className="dropzone">
            Selecione o PDF do relatório revisado
            <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv"
              onChange={(ev) => { setRevArquivos(Array.from(ev.target.files)); setRevDescricoes({}); }} />
          </div>
          {revArquivos.length > 0 && revArquivos.map((a, i) => (
            <div key={i} className="campo" style={{ marginTop: 8, marginBottom: 0 }}>
              <label className="mono" style={{ fontSize: 13 }}>{a.name}</label>
              {ehPlanilha(a) && (
                <input className="input" placeholder='Sobre o que é essa planilha? Ex.: "Planilha AS BUILT"'
                  value={revDescricoes[i] || ''} onChange={(ev) => setRevDescricoes((d) => ({ ...d, [i]: ev.target.value }))} />
              )}
            </div>
          ))}
        </div>
        {revErro && <div className="alerta alerta-erro" style={{ marginBottom: 12 }}>{revErro}</div>}
        <hr className="divisor" />
        <div className="row row-fim">
          <button className="btn btn-primario" disabled={ocupado} onClick={() => {
            const semDescricao = revArquivos.findIndex((a, i) => ehPlanilha(a) && !(revDescricoes[i] || '').trim());
            if (semDescricao !== -1) {
              setRevErro(`Descreva o conteúdo da planilha "${revArquivos[semDescricao].name}" antes de enviar.`);
              return;
            }
            setRevErro('');
            acao(async () => {
              await api.reenviar(rel.id, {});
              if (revArquivos.length > 0) {
                await api.anexarMedicao(rel.id, revArquivos, revArquivos.map((_, i) => revDescricoes[i] || ''));
                setRevArquivos([]);
                setRevDescricoes({});
              }
            });
          }}>Reenviar para análise</button>
        </div>
      </div>
    );
  }

  // ---- Colaborador: documentação fiscal ----
  if (!ehCoordenador && (e === 'APROVADO' || e === 'CORRECAO_DOCUMENTAL')) {
    return (
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>{e === 'APROVADO' ? 'Incluir documentação fiscal' : 'Reenviar documentos contábeis'}</h3>
        <p className="descricao" style={{ marginBottom: 14 }}>Ao incluir, o sistema solicita automaticamente o atesto ao financeiro. PDF, planilhas ou compactado (zip/rar).</p>
        <div className="dropzone">Selecione os documentos fiscais<input type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.zip,.rar" onChange={(ev) => setArquivos(Array.from(ev.target.files))} /></div>
        {arquivos.length > 0 && <p className="descricao" style={{ marginTop: 10 }}>{arquivos.length} arquivo(s) selecionado(s).</p>}
        <div className="row row-fim" style={{ marginTop: 14 }}>
          <button className="btn btn-primario" disabled={ocupado || arquivos.length === 0}
            onClick={() => acao(() => api.incluirDocFiscal(rel.id, arquivos))}>{e === 'APROVADO' ? 'Incluir e solicitar atesto' : 'Reenviar documentos'}</button>
        </div>
      </div>
    );
  }

  // ---- Concluído ----
  if (e === 'CONCLUIDO') {
    const ultimoAtesto = (rel.atestos || [])[rel.atestos.length - 1] || null;
    const atestoAnexo = ultimoAtesto?.anexoId
      ? (rel.anexos || []).find((a) => a.id === ultimoAtesto.anexoId)
      : null;
    return (
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <div className="alerta alerta-info">
          <b>Processo concluído.</b> O atesto contábil foi emitido.
          {ultimoAtesto?.observacoes ? <div style={{ marginTop: 6 }}>{ultimoAtesto.observacoes}</div> : null}
        </div>
        {atestoAnexo && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-secundario" onClick={() => api.baixarAnexo(atestoAnexo.id, atestoAnexo.nomeArquivo)}>Baixar atesto</button>
          </div>
        )}
        {ehCoordenador && (
          <>
            <hr className="divisor" />
            <div className="campo">
              <label>Reabrir processo <span className="dica">(justificativa obrigatória)</span></label>
              <p className="descricao" style={{ marginBottom: 8 }}>
                Volta para "Correção documental" — o autor poderá anexar novos documentos fiscais
                e reenviar para um novo atesto. O histórico atual é preservado.
              </p>
              <textarea className="textarea" value={reabrirTexto} onChange={(ev) => setReabrirTexto(ev.target.value)}
                placeholder="Motivo da reabertura…" />
            </div>
            <div className="row row-fim">
              <button className="btn btn-secundario" disabled={ocupado || !reabrirTexto.trim()}
                onClick={() => acao(() => api.reabrir(rel.id, reabrirTexto)).then(() => setReabrirTexto(''))}>
                Reabrir processo
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (e === 'EM_ANALISE' || e === 'AGUARDANDO_ATESTO') {
    return <div className="alerta alerta-info" style={{ marginTop: 16 }}>{e === 'EM_ANALISE' ? 'Aguardando análise do coordenador.' : 'Aguardando o atesto do coordenador.'}</div>;
  }
  return null;
}
