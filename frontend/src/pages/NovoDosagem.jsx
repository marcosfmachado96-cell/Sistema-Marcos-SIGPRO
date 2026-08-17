import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export function NovoDosagem() {
  const navigate = useNavigate();
  const [descricao, setDescricao] = useState('');
  const [contrato, setContrato] = useState('');
  const [rodovias, setRodovias] = useState(['']);
  const [arquivos, setArquivos] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function setRodovia(i, v) {
    setRodovias((r) => { const c = [...r]; c[i] = v; return c; });
  }
  function addRodovia() { setRodovias((r) => [...r, '']); }
  function rmRodovia(i) { setRodovias((r) => r.filter((_, j) => j !== i)); }

  async function aoSalvar(e) {
    e.preventDefault();
    setErro('');
    const rodoviasValidas = rodovias.map((r) => r.trim()).filter(Boolean);
    if (rodoviasValidas.length === 0) {
      setErro('Informe ao menos uma rodovia.');
      return;
    }
    setEnviando(true);
    try {
      const p = await api.criarDosagem({ descricao, contrato, rodovias: rodoviasValidas });
      if (arquivos.length > 0) {
        await api.anexarDosagem(p.id, arquivos);
      }
      navigate(`/dosagem/${p.id}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Revestimento primário</div>
          <h1>Novo projeto de dosagem</h1>
          <div className="descricao">Dosagem e caracterização de material.</div>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <form onSubmit={aoSalvar}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16 }}>Identificação</h3>
          <div className="campo">
            <label>Descrição</label>
            <textarea className="textarea" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Dosagem de brita graduada simples para revestimento primário…" required />
          </div>
          <div className="campo">
            <label>Contrato</label>
            <input className="input" value={contrato} onChange={(e) => setContrato(e.target.value)}
              placeholder="CO 036/2022 DOP" required />
          </div>
          <div className="campo">
            <label>Rodovias <span className="dica">(onde o material é utilizado)</span></label>
            {rodovias.map((r, i) => (
              <div key={i} className="row" style={{ marginBottom: 6 }}>
                <input className="input" style={{ flex: 1 }} value={r} onChange={(e) => setRodovia(i, e.target.value)}
                  placeholder="Ex.: PR-408" />
                {rodovias.length > 1 && <button type="button" className="btn btn-secundario" onClick={() => rmRodovia(i)}>×</button>}
              </div>
            ))}
            <button type="button" className="btn btn-secundario" onClick={addRodovia}>+ rodovia</button>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 6 }}>Anexos</h3>
          <p className="descricao" style={{ marginBottom: 12 }}>Laudo/relatório de laboratório — PDF ou planilha (xlsx, xls, csv).</p>
          <div className="dropzone">
            Selecione os arquivos
            <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => setArquivos(Array.from(e.target.files))} />
          </div>
          {arquivos.length > 0 && (
            <p className="descricao" style={{ marginTop: 10 }}>{arquivos.length} arquivo(s) selecionado(s).</p>
          )}
        </div>

        <div className="row row-fim" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secundario" onClick={() => navigate('/dosagem')}>Cancelar</button>
          <button className="btn btn-primario" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Cadastrar projeto'}
          </button>
        </div>
      </form>
    </>
  );
}
