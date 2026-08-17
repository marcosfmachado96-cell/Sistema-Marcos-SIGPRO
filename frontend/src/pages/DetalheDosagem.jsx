import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { fmtDataHora } from '../util';

export function DetalheDosagem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, ehCoordenador } = useAuth();

  const [p, setP] = useState(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [contrato, setContrato] = useState('');
  const [rodovias, setRodovias] = useState(['']);
  const [salvando, setSalvando] = useState(false);
  const [novosArquivos, setNovosArquivos] = useState([]);
  const [enviandoArquivos, setEnviandoArquivos] = useState(false);

  const carregar = useCallback(() => {
    api.detalharDosagem(id)
      .then((d) => {
        setP(d);
        setDescricao(d.descricao);
        setContrato(d.contrato);
        setRodovias(d.rodovias.length ? d.rodovias : ['']);
      })
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  const ehAutor = p && usuario && p.autorId === usuario.id;

  function setRodovia(i, v) { setRodovias((r) => { const c = [...r]; c[i] = v; return c; }); }
  function addRodovia() { setRodovias((r) => [...r, '']); }
  function rmRodovia(i) { setRodovias((r) => r.filter((_, j) => j !== i)); }

  async function salvar() {
    setErro('');
    const rodoviasValidas = rodovias.map((r) => r.trim()).filter(Boolean);
    if (rodoviasValidas.length === 0) { setErro('Informe ao menos uma rodovia.'); return; }
    setSalvando(true);
    try {
      await api.atualizarDosagem(id, { descricao, contrato, rodovias: rodoviasValidas });
      setEditando(false);
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function excluir() {
    if (!window.confirm('Excluir este projeto de dosagem? Essa ação não pode ser desfeita.')) return;
    setErro('');
    try { await api.excluirDosagem(id); navigate('/dosagem'); }
    catch (e) { setErro(e.message); }
  }

  async function enviarAnexos() {
    if (novosArquivos.length === 0) return;
    setErro('');
    setEnviandoArquivos(true);
    try {
      await api.anexarDosagem(id, novosArquivos);
      setNovosArquivos([]);
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setEnviandoArquivos(false); }
  }

  if (erro && !p) return <div className="alerta alerta-erro">{erro}</div>;
  if (!p) return <div className="carregando">Carregando…</div>;

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Revestimento primário</div>
          <h1>{p.descricao}</h1>
          <div className="descricao">{p.autor?.nome}{p.autor?.contratada ? ` · ${p.autor.contratada}` : ''} · {fmtDataHora(p.criadoEm)}</div>
        </div>
        <div className="row">
          {ehAutor && !editando && (
            <>
              <button className="btn btn-secundario" onClick={() => setEditando(true)}>Editar</button>
              <button className="btn btn-reprovar" onClick={excluir}>Excluir</button>
            </>
          )}
          <button className="btn btn-secundario" onClick={() => navigate('/dosagem')}>Voltar</button>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      {editando ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>Editar projeto</h3>
          <div className="campo">
            <label>Descrição</label>
            <textarea className="textarea" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Contrato</label>
            <input className="input" value={contrato} onChange={(e) => setContrato(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Rodovias</label>
            {rodovias.map((r, i) => (
              <div key={i} className="row" style={{ marginBottom: 6 }}>
                <input className="input" style={{ flex: 1 }} value={r} onChange={(e) => setRodovia(i, e.target.value)} placeholder="Ex.: PR-408" />
                {rodovias.length > 1 && <button type="button" className="btn btn-secundario" onClick={() => rmRodovia(i)}>×</button>}
              </div>
            ))}
            <button type="button" className="btn btn-secundario" onClick={addRodovia}>+ rodovia</button>
          </div>
          <div className="row row-fim" style={{ marginTop: 12 }}>
            <button className="btn btn-secundario" onClick={() => { setEditando(false); carregar(); }}>Cancelar</button>
            <button className="btn btn-primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      ) : (
        <div className="card card-pad meta-cards" style={{ marginBottom: 16 }}>
          <MetaCard icone="folder" titulo="Contrato" valor={p.contrato} />
          <MetaCard icone="doc" titulo="Rodovias" valor={(p.rodovias || []).join(', ')} />
        </div>
      )}

      <div className="card card-pad">
        <h3 style={{ marginBottom: 12 }}>Anexos</h3>
        {(p.anexos || []).length === 0 && <p className="descricao" style={{ marginBottom: ehAutor ? 12 : 0 }}>Nenhum anexo.</p>}
        {(p.anexos || []).length > 0 && (
          <ul className="lista-anexos" style={{ marginBottom: ehAutor ? 12 : 0 }}>
            {p.anexos.map((a) => (
              <li key={a.id}>
                <button className="link-anexo" onClick={() => api.baixarAnexoDosagem(a.id, a.nomeArquivo)}>{a.nomeArquivo}</button>
              </li>
            ))}
          </ul>
        )}
        {ehAutor && (
          <>
            <div className="dropzone">
              Selecione os arquivos
              <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => setNovosArquivos(Array.from(e.target.files))} />
            </div>
            {novosArquivos.length > 0 && (
              <div className="row row-fim" style={{ marginTop: 10 }}>
                <button className="btn btn-primario" disabled={enviandoArquivos} onClick={enviarAnexos}>
                  {enviandoArquivos ? 'Enviando…' : `Anexar ${novosArquivos.length} arquivo(s)`}
                </button>
              </div>
            )}
          </>
        )}
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
