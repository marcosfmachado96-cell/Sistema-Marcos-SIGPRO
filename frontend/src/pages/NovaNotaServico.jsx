import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { fmtRodovia } from '../util';
import { CampoContrato } from '../components/CampoContrato';

const ROTULO_PROGRAMA = { PROMAC: 'PROMAC', PROSEG: 'PROSEG', NAO_PAVIMENTADA: 'Não Pavimentada' };

export function NovaNotaServico() {
  const navigate = useNavigate();
  const [rodovias, setRodovias] = useState([]);
  const [form, setForm] = useState({
    numero: '', contrato: '', descricao: '', programa: '',
    dataEmissao: new Date().toISOString().slice(0, 10),
    rodovia: '', kmInicial: '', kmFinal: '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api.rodoviasMapa().then(setRodovias).catch(() => {}); }, []);

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function aoSalvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const n = await api.criarNotaServico({
        ...form,
        rodovia: Number(form.rodovia),
        kmInicial: Number(form.kmInicial),
        kmFinal: Number(form.kmFinal || form.kmInicial),
      });
      navigate('/mapa-operacional', { state: { destacarId: n.id } });
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
          <div className="eyebrow">Mapa Operacional</div>
          <h1>Nova nota de serviço</h1>
          <div className="descricao">Informe a rodovia e o km — o ponto é localizado automaticamente no mapa.</div>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <form onSubmit={aoSalvar}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16 }}>Identificação</h3>
          <div className="grade-2">
            <div className="campo">
              <label>Nº da nota de serviço</label>
              <input className="input" value={form.numero} onChange={(e) => set('numero', e.target.value)} required />
            </div>
            <div className="campo">
              <label>Contrato</label>
              <CampoContrato value={form.contrato} onChange={(v) => set('contrato', v)} required />
            </div>
          </div>
          <div className="campo">
            <label>Descrição</label>
            <input className="input" value={form.descricao} onChange={(e) => set('descricao', e.target.value)}
              placeholder="Ex.: Recomposição de revestimento primário…" required />
          </div>
          <div className="grade-2">
            <div className="campo">
              <label>Programa</label>
              <select className="input" value={form.programa} onChange={(e) => set('programa', e.target.value)} required>
                <option value="">Selecione…</option>
                {Object.entries(ROTULO_PROGRAMA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Data de emissão <span className="dica">(pode ser retroativa)</span></label>
              <input className="input" type="date" value={form.dataEmissao} onChange={(e) => set('dataEmissao', e.target.value)} required />
            </div>
          </div>

          <h3 style={{ margin: '16px 0' }}>Localização</h3>
          <div className="grade-2">
            <div className="campo">
              <label>Rodovia</label>
              <select className="input" value={form.rodovia} onChange={(e) => set('rodovia', e.target.value)} required>
                <option value="">Selecione…</option>
                {rodovias.map((r) => <option key={r} value={r}>{fmtRodovia(r)}</option>)}
              </select>
            </div>
          </div>
          <div className="grade-2">
            <div className="campo">
              <label>Km inicial</label>
              <input className="input mono" type="number" step="0.01" value={form.kmInicial}
                onChange={(e) => set('kmInicial', e.target.value)} required />
            </div>
            <div className="campo">
              <label>Km final <span className="dica">(opcional — igual ao inicial se for um ponto único)</span></label>
              <input className="input mono" type="number" step="0.01" value={form.kmFinal}
                onChange={(e) => set('kmFinal', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="row row-fim" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secundario" onClick={() => navigate('/mapa-operacional')}>Cancelar</button>
          <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Cadastrar'}</button>
        </div>
      </form>
    </>
  );
}
