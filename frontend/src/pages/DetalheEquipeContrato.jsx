import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { fmtData, fmtDataHora } from '../util';
import { ROTULO_AREA, fmtPercentual } from '../equipes';
import { CampoContrato } from '../components/CampoContrato';

const MEMBRO_VAZIO = { nome: '', cargo: '', percentual: '' };
const dataInput = (d) => (d ? String(d).slice(0, 10) : '');

export function DetalheEquipeContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, ehCoordenador } = useAuth();

  const [c, setC] = useState(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [novoMembro, setNovoMembro] = useState(MEMBRO_VAZIO);
  const [editandoMembro, setEditandoMembro] = useState(null); // { id, nome, cargo, percentual }
  const [novaAlteracao, setNovaAlteracao] = useState({ dataFim: '', instrumento: '', observacao: '' });

  const carregar = useCallback(() => {
    api.detalharEquipe(id)
      .then((d) => {
        setC(d);
        setForm({ numero: d.numero, descricao: d.descricao, area: d.area, dataInicio: dataInput(d.dataInicio), dataFim: dataInput(d.dataFim) });
      })
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  const podeEditar = c && usuario && (c.autorId === usuario.id || ehCoordenador);

  async function executar(fn) {
    setErro('');
    try { await fn(); carregar(); return true; } catch (e) { setErro(e.message); return false; }
  }

  async function salvarContrato() {
    setSalvando(true);
    if (await executar(() => api.atualizarEquipe(id, form))) setEditando(false);
    setSalvando(false);
  }

  async function excluirContrato() {
    if (!window.confirm('Excluir este contrato e a sua equipe? Essa ação não pode ser desfeita.')) return;
    setErro('');
    try { await api.excluirEquipe(id); navigate('/equipes'); } catch (e) { setErro(e.message); }
  }

  async function adicionarMembro(e) {
    e.preventDefault();
    if (await executar(() => api.adicionarMembroEquipe(id, novoMembro))) setNovoMembro(MEMBRO_VAZIO);
  }

  async function salvarMembro() {
    const { id: membroId, ...dados } = editandoMembro;
    if (await executar(() => api.atualizarMembroEquipe(membroId, dados))) setEditandoMembro(null);
  }

  async function removerMembro(m) {
    if (!window.confirm(`Remover ${m.nome} da equipe?`)) return;
    executar(() => api.removerMembroEquipe(m.id));
  }

  async function adicionarAlteracao(e) {
    e.preventDefault();
    if (await executar(() => api.adicionarAlteracaoPrazo(id, novaAlteracao))) {
      setNovaAlteracao({ dataFim: '', instrumento: '', observacao: '' });
    }
  }

  if (erro && !c) return <div className="alerta alerta-erro">{erro}</div>;
  if (!c) return <div className="carregando">Carregando…</div>;

  const totalEquipe = c.membros.reduce((s, m) => s + m.percentual, 0);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Equipe por contrato · {ROTULO_AREA[c.area]}</div>
          <h1>{c.numero}</h1>
          <div className="descricao">{c.descricao}</div>
        </div>
        <div className="row">
          {podeEditar && !editando && (
            <>
              <button className="btn btn-secundario" onClick={() => setEditando(true)}>Editar</button>
              <button className="btn btn-reprovar" onClick={excluirContrato}>Excluir</button>
            </>
          )}
          <button className="btn btn-secundario" onClick={() => navigate('/equipes')}>Voltar</button>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      {editando ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>Editar contrato</h3>
          <div className="grade-2">
            <div className="campo">
              <label>Contrato</label>
              <CampoContrato value={form.numero} onChange={(v) => setForm((f) => ({ ...f, numero: v }))} required />
            </div>
            <div className="campo">
              <label>Área de gestão</label>
              <select className="input" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}>
                {Object.entries(ROTULO_AREA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="campo">
            <label>Descrição</label>
            <input className="input" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="grade-2">
            <div className="campo">
              <label>Data de início</label>
              <input className="input" type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
            </div>
            <div className="campo">
              <label>Data de fim (original)</label>
              <input className="input" type="date" value={form.dataFim} onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} />
            </div>
          </div>
          <div className="row row-fim" style={{ marginTop: 12 }}>
            <button className="btn btn-secundario" onClick={() => { setEditando(false); carregar(); }}>Cancelar</button>
            <button className="btn btn-primario" disabled={salvando} onClick={salvarContrato}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      ) : (
        <div className="card card-pad meta-cards" style={{ marginBottom: 16 }}>
          <div className="meta-card"><div><div className="meta-rot">Início</div><div className="meta-val">{fmtData(c.dataInicio)}</div></div></div>
          <div className="meta-card"><div><div className="meta-rot">Término original</div><div className="meta-val">{fmtData(c.dataFim)}</div></div></div>
          <div className="meta-card"><div><div className="meta-rot">Término vigente</div><div className="meta-val">{fmtData(c.dataFimVigente)}</div></div></div>
          <div className="meta-card"><div><div className="meta-rot">Cadastrado por</div><div className="meta-val">{c.autor?.nome}{c.autor?.contratada ? ` · ${c.autor.contratada}` : ''}</div></div></div>
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Equipe de administração local ({c.membros.length})</h3>

        {c.membros.length === 0 && <p className="descricao" style={{ marginBottom: 12 }}>Nenhum profissional cadastrado ainda.</p>}
        {c.membros.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table className="tabela">
              <thead>
                <tr><th>Nome completo</th><th>Cargo</th><th>% mensal</th><th>Conferência</th><th></th></tr>
              </thead>
              <tbody>
                {c.membros.map((m) => {
                  const emEdicao = editandoMembro?.id === m.id;
                  const exc = m.sobreposicoes.some((t) => t.excede);
                  return (
                    <tr key={m.id} style={{ cursor: 'default' }}>
                      {emEdicao ? (
                        <>
                          <td><input className="input" value={editandoMembro.nome} onChange={(e) => setEditandoMembro((x) => ({ ...x, nome: e.target.value }))} /></td>
                          <td><input className="input" value={editandoMembro.cargo} onChange={(e) => setEditandoMembro((x) => ({ ...x, cargo: e.target.value }))} /></td>
                          <td style={{ width: 110 }}><input className="input mono" type="number" min="0.01" max="100" step="0.01" value={editandoMembro.percentual} onChange={(e) => setEditandoMembro((x) => ({ ...x, percentual: e.target.value }))} /></td>
                          <td></td>
                          <td className="col-acoes">
                            <button className="btn btn-secundario btn-sm" onClick={() => setEditandoMembro(null)}>Cancelar</button>{' '}
                            <button className="btn btn-primario btn-sm" onClick={salvarMembro}>Salvar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{m.nome}</td>
                          <td>{m.cargo}</td>
                          <td className="col-num">{fmtPercentual(m.percentual)}</td>
                          <td>
                            {m.sobreposicoes.length === 0 ? '—' : m.sobreposicoes.map((t, i) => (
                              <div key={i} style={{ marginBottom: 4 }}>
                                <span className={`badge ${t.excede ? 'badge-vermelho' : 'badge-ambar'}`}>
                                  {fmtData(t.inicio)} a {fmtData(t.fim)} · soma {fmtPercentual(t.total)}
                                </span>
                                <div className="descricao" style={{ fontSize: 12.5 }}>
                                  também em {t.contratos.filter((x) => x.contratoId !== c.id).map((x) => `${x.numero} (${fmtPercentual(x.percentual)})`).join(', ')}
                                </div>
                              </div>
                            ))}
                            {exc && <div className="descricao" style={{ color: 'var(--st-vermelho)', fontSize: 12.5 }}>Soma acima de 100% no período.</div>}
                          </td>
                          <td className="col-acoes">
                            {podeEditar && (
                              <>
                                <button className="btn btn-secundario btn-sm" onClick={() => setEditandoMembro({ id: m.id, nome: m.nome, cargo: m.cargo, percentual: m.percentual })}>Editar</button>{' '}
                                <button className="btn btn-reprovar btn-sm" onClick={() => removerMembro(m)}>Remover</button>
                              </>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="descricao" style={{ marginTop: 8 }}>Soma dos percentuais da equipe: {fmtPercentual(totalEquipe)}</p>
          </div>
        )}

        {podeEditar && (
          <form onSubmit={adicionarMembro}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px', alignItems: 'end' }}>
              <div className="campo">
                <label>Nome completo</label>
                <input className="input" value={novoMembro.nome} onChange={(e) => setNovoMembro((m) => ({ ...m, nome: e.target.value }))} required />
              </div>
              <div className="campo">
                <label>Cargo</label>
                <input className="input" value={novoMembro.cargo} onChange={(e) => setNovoMembro((m) => ({ ...m, cargo: e.target.value }))} required />
              </div>
              <div className="campo">
                <label>% mensal prevista</label>
                <input className="input mono" type="number" min="0.01" max="100" step="0.01" value={novoMembro.percentual} onChange={(e) => setNovoMembro((m) => ({ ...m, percentual: e.target.value }))} required />
              </div>
            </div>
            <div className="row row-fim">
              <button className="btn btn-primario">Adicionar profissional</button>
            </div>
          </form>
        )}
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 12 }}>Alterações de prazo</h3>
        {c.alteracoes.length === 0 && <p className="descricao" style={{ marginBottom: 12 }}>Nenhuma alteração de prazo registrada. Vigência: {fmtData(c.dataInicio)} a {fmtData(c.dataFim)}.</p>}
        {c.alteracoes.length > 0 && (
          <ul className="timeline" style={{ marginBottom: 16 }}>
            {c.alteracoes.map((a, i) => (
              <li key={a.id}>
                <div className="tl-acao">
                  <span className={`badge ${i === 0 ? 'badge-azul' : 'badge-grafite'}`}>Novo término: {fmtData(a.dataFim)}</span>
                  {i === 0 && <span className="descricao"> · vigente</span>}
                </div>
                <div className="tl-meta">{a.instrumento ? `${a.instrumento} · ` : ''}Registrado em {fmtDataHora(a.criadoEm)}</div>
                {a.observacao && <div style={{ marginTop: 6 }}><b>Observação:</b> {a.observacao}</div>}
                {podeEditar && (
                  <button className="btn btn-secundario btn-sm" style={{ marginTop: 6 }}
                    onClick={() => window.confirm('Remover esta alteração de prazo?') && executar(() => api.removerAlteracaoPrazo(a.id))}>
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {podeEditar && (
          <form onSubmit={adicionarAlteracao}>
            <div className="grade-2">
              <div className="campo">
                <label>Novo término</label>
                <input className="input" type="date" value={novaAlteracao.dataFim} onChange={(e) => setNovaAlteracao((a) => ({ ...a, dataFim: e.target.value }))} required />
              </div>
              <div className="campo">
                <label>Instrumento <span className="dica">(opcional)</span></label>
                <input className="input" value={novaAlteracao.instrumento} onChange={(e) => setNovaAlteracao((a) => ({ ...a, instrumento: e.target.value }))} placeholder="Ex.: 1º Termo Aditivo" />
              </div>
            </div>
            <div className="campo">
              <label>Observações <span className="dica">(opcional)</span></label>
              <textarea className="textarea" value={novaAlteracao.observacao} onChange={(e) => setNovaAlteracao((a) => ({ ...a, observacao: e.target.value }))} />
            </div>
            <div className="row row-fim">
              <button className="btn btn-primario">Registrar alteração de prazo</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
