import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ROTULO_AREA } from '../equipes';
import { CampoContrato } from '../components/CampoContrato';

export function NovaEquipeContrato() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ numero: '', descricao: '', area: '', dataInicio: '', dataFim: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function aoSalvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const c = await api.criarEquipe(form);
      navigate(`/equipes/${c.id}`);
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
          <div className="eyebrow">Equipe por contrato</div>
          <h1>Novo contrato</h1>
          <div className="descricao">Cadastre o contrato; em seguida você informa a equipe de administração local.</div>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <form onSubmit={aoSalvar}>
        <div className="card card-pad">
          <div className="grade-2">
            <div className="campo">
              <label>Contrato</label>
              <CampoContrato value={form.numero} onChange={(v) => set('numero', v)} required />
            </div>
            <div className="campo">
              <label>Área de gestão</label>
              <select className="input" value={form.area} onChange={(e) => set('area', e.target.value)} required>
                <option value="">Selecione…</option>
                {Object.entries(ROTULO_AREA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="campo">
            <label>Descrição</label>
            <input className="input" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} required />
          </div>
          <div className="grade-2">
            <div className="campo">
              <label>Data de início</label>
              <input className="input" type="date" value={form.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} required />
            </div>
            <div className="campo">
              <label>Data de fim</label>
              <input className="input" type="date" value={form.dataFim} min={form.dataInicio} onChange={(e) => set('dataFim', e.target.value)} required />
            </div>
          </div>
          <div className="row row-fim" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secundario" onClick={() => navigate('/equipes')}>Cancelar</button>
            <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Cadastrar contrato'}</button>
          </div>
        </div>
      </form>
    </>
  );
}
