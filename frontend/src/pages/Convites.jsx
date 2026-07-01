import { useEffect, useState } from 'react';
import { api } from '../api';
import { fmtDataHora } from '../util';

const ST = { PENDENTE: 'badge-ambar', ACEITO: 'badge-verde', EXPIRADO: 'badge-vermelho', REVOGADO: 'badge-vermelho' };

export function Convites() {
  const [convites, setConvites] = useState(null);
  const [email, setEmail] = useState('');
  const [contratada, setContratada] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    api.listarConvites().then(setConvites).catch((e) => setErro(e.message));
  }
  useEffect(() => { carregar(); }, []);

  async function convidar(e) {
    e.preventDefault();
    setErro(''); setAviso(''); setEnviando(true);
    try {
      await api.convidar({ email, contratada, perfil: 'USUARIO' });
      setAviso(`Convite enviado para ${email}.`);
      setEmail(''); setContratada('');
      carregar();
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
          <div className="eyebrow">Coordenação</div>
          <h1>Convites</h1>
          <div className="descricao">O acesso é exclusivo por convite. Cada colaborador define a própria senha no primeiro acesso.</div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Convidar colaborador</h3>
        {erro && <div className="alerta alerta-erro" style={{ marginBottom: 12 }}>{erro}</div>}
        {aviso && <div className="alerta alerta-info" style={{ marginBottom: 12 }}>{aviso}</div>}
        <form onSubmit={convidar}>
          <div className="grade-2">
            <div className="campo">
              <label>E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="campo">
              <label>Responsável <span className="dica">(opcional)</span></label>
              <input className="input" value={contratada} onChange={(e) => setContratada(e.target.value)} placeholder="Nome ou empresa" />
            </div>
          </div>
          <div className="row row-fim">
            <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar convite'}</button>
          </div>
        </form>
      </div>

      {convites && convites.length > 0 && (
        <div className="card">
          <table className="tabela">
            <thead>
              <tr><th>E-mail</th><th>Expira em</th><th>Status</th></tr>
            </thead>
            <tbody>
              {convites.map((c) => (
                <tr key={c.id} style={{ cursor: 'default' }}>
                  <td>{c.email}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{fmtDataHora(c.expiraEm)}</td>
                  <td><span className={`badge ${ST[c.status] || 'badge-azul'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
