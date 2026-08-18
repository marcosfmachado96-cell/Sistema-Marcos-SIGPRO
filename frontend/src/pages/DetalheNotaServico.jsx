import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { fmtDataHora } from '../util';

const ROTULO_TIPO = {
  MOBILIZACAO: 'Mobilização', DESMOBILIZACAO: 'Desmobilização', OCORRENCIA: 'Ocorrência',
  PARALISACAO: 'Paralisação', RETOMADA: 'Retomada', ANDAMENTO: 'Andamento',
};
const BADGE_TIPO = {
  MOBILIZACAO: 'badge-azul', DESMOBILIZACAO: 'badge-grafite', OCORRENCIA: 'badge-ambar',
  PARALISACAO: 'badge-vermelho', RETOMADA: 'badge-verde', ANDAMENTO: 'badge-verde',
};

export function DetalheNotaServico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [nota, setNota] = useState(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [tipo, setTipo] = useState('ANDAMENTO');
  const [dataEvento, setDataEvento] = useState(() => new Date().toISOString().slice(0, 10));
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState([]);
  const [enviandoEvento, setEnviandoEvento] = useState(false);

  const carregar = useCallback(() => {
    api.detalharNotaServico(id)
      .then((n) => {
        setNota(n);
        setForm({ numero: n.numero, contrato: n.contrato, descricao: n.descricao, rodovia: n.rodovia, kmInicial: n.kmInicial, kmFinal: n.kmFinal });
      })
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  const ehAutor = nota && usuario && nota.autorId === usuario.id;

  async function salvar() {
    setErro('');
    setSalvando(true);
    try {
      await api.atualizarNotaServico(id, form);
      setEditando(false);
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function excluir() {
    if (!window.confirm('Excluir esta nota de serviço? Essa ação não pode ser desfeita.')) return;
    setErro('');
    try { await api.excluirNotaServico(id); navigate('/mapa-operacional'); }
    catch (e) { setErro(e.message); }
  }

  async function registrarEvento(e) {
    e.preventDefault();
    setErro('');
    setEnviandoEvento(true);
    try {
      const ev = await api.adicionarEventoNota(id, { tipo, data: dataEvento, texto });
      if (fotos.length > 0) await api.anexarEventoNota(ev.id, fotos);
      setTexto(''); setFotos([]);
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setEnviandoEvento(false); }
  }

  if (erro && !nota) return <div className="alerta alerta-erro">{erro}</div>;
  if (!nota) return <div className="carregando">Carregando…</div>;

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Mapa Operacional · PR-{nota.rodovia} · km {nota.kmInicial}{nota.kmFinal != nota.kmInicial ? ` a ${nota.kmFinal}` : ''}</div>
          <h1>{nota.numero}</h1>
          <div className="descricao">{nota.autor?.nome}{nota.autor?.contratada ? ` · ${nota.autor.contratada}` : ''} · {fmtDataHora(nota.criadoEm)}</div>
        </div>
        <div className="row">
          {ehAutor && !editando && (
            <>
              <button className="btn btn-secundario" onClick={() => setEditando(true)}>Editar</button>
              <button className="btn btn-reprovar" onClick={excluir}>Excluir</button>
            </>
          )}
          <button className="btn btn-secundario" onClick={() => navigate('/mapa-operacional')}>Voltar ao mapa</button>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      {editando ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>Editar nota de serviço</h3>
          <div className="grade-2">
            <div className="campo">
              <label>Nº da nota</label>
              <input className="input" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} required />
            </div>
            <div className="campo">
              <label>Contrato</label>
              <input className="input" value={form.contrato} onChange={(e) => setForm((f) => ({ ...f, contrato: e.target.value }))} required />
            </div>
          </div>
          <div className="campo">
            <label>Descrição</label>
            <input className="input" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} required />
          </div>
          <div className="grade-2">
            <div className="campo">
              <label>Rodovia</label>
              <input className="input mono" type="number" value={form.rodovia} onChange={(e) => setForm((f) => ({ ...f, rodovia: e.target.value }))} required />
            </div>
            <div className="campo">
              <label>Km inicial</label>
              <input className="input mono" type="number" step="0.01" value={form.kmInicial} onChange={(e) => setForm((f) => ({ ...f, kmInicial: e.target.value }))} required />
            </div>
          </div>
          <div className="campo" style={{ maxWidth: 260 }}>
            <label>Km final</label>
            <input className="input mono" type="number" step="0.01" value={form.kmFinal} onChange={(e) => setForm((f) => ({ ...f, kmFinal: e.target.value }))} />
          </div>
          <div className="row row-fim" style={{ marginTop: 12 }}>
            <button className="btn btn-secundario" onClick={() => { setEditando(false); carregar(); }}>Cancelar</button>
            <button className="btn btn-primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      ) : (
        <div className="card card-pad meta-cards" style={{ marginBottom: 16 }}>
          <MetaCard icone="folder" titulo="Contrato" valor={nota.contrato} />
          <MetaCard icone="doc" titulo="Descrição" valor={nota.descricao} />
        </div>
      )}

      {ehAutor && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Registrar evento</h3>
          <form onSubmit={registrarEvento}>
            <div className="grade-2">
              <div className="campo">
                <label>Tipo</label>
                <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </div>
              <div className="campo">
                <label>Data</label>
                <input className="input" type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} required />
              </div>
            </div>
            <div className="campo">
              <label>Observações <span className="dica">(opcional)</span></label>
              <textarea className="textarea" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
            <div className="campo">
              <label>Fotos <span className="dica">(opcional)</span></label>
              <div className="dropzone">
                Selecione as fotos ou documentos
                <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv,image/*" onChange={(e) => setFotos(Array.from(e.target.files))} />
              </div>
              {fotos.length > 0 && <p className="descricao" style={{ marginTop: 8 }}>{fotos.length} arquivo(s) selecionado(s).</p>}
            </div>
            <div className="row row-fim">
              <button className="btn btn-primario" disabled={enviandoEvento}>{enviandoEvento ? 'Registrando…' : 'Registrar evento'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Histórico</h3>
        {(nota.eventos || []).length === 0 && <p className="descricao">Nenhum evento registrado ainda.</p>}
        <ul className="timeline">
          {(nota.eventos || []).map((ev) => (
            <li key={ev.id}>
              <div className="tl-acao">
                <span className={`badge ${BADGE_TIPO[ev.tipo] || 'badge-azul'}`}>{ROTULO_TIPO[ev.tipo] || ev.tipo}</span>
              </div>
              <div className="tl-meta">{ev.autor?.nome} · {fmtDataHora(ev.data)}</div>
              {ev.texto && <div style={{ marginTop: 4 }}>{ev.texto}</div>}
              {(ev.anexos || []).length > 0 && (
                <ul className="lista-anexos" style={{ marginTop: 6 }}>
                  {ev.anexos.map((a) => (
                    <li key={a.id}>
                      <button className="link-anexo" onClick={() => api.baixarAnexoEventoNota(a.id, a.nomeArquivo)}>{a.nomeArquivo}</button>
                    </li>
                  ))}
                </ul>
              )}
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
};
function MetaCard({ icone, titulo, valor }) {
  return (
    <div className="meta-card">
      <div className="meta-ic">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {(META_ICONES[icone] || []).map((p, i) => <path key={i} d={p} />)}
        </svg>
      </div>
      <div>
        <div className="meta-rot">{titulo}</div>
        <div className="meta-val">{valor || '—'}</div>
      </div>
    </div>
  );
}
