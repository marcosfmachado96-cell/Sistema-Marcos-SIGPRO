import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { fmtDataHora } from '../util';

const STATUS_ROTULO = { ABERTA: 'Aberta', EM_ANDAMENTO: 'Em andamento', RESOLVIDA: 'Resolvida' };
const STATUS_BADGE = { ABERTA: 'badge-azul', EM_ANDAMENTO: 'badge-ambar', RESOLVIDA: 'badge-verde' };

export function Solicitacoes() {
  const { ehCoordenador } = useAuth();
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    api.listarSolicitacoes().then(setLista).catch((e) => setErro(e.message));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function criar(e) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try {
      await api.criarSolicitacao({ titulo, descricao });
      setTitulo(''); setDescricao(''); carregar();
    } catch (err) { setErro(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Solicitações</div>
          <h1>{ehCoordenador ? 'Solicitações dos colaboradores' : 'Minhas solicitações'}</h1>
          <div className="descricao">Solicitações gerais — dúvidas, pedidos e comunicações.</div>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      {!ehCoordenador && (
        <form className="card card-pad" style={{ marginBottom: 16 }} onSubmit={criar}>
          <h3 style={{ marginBottom: 12 }}>Nova solicitação</h3>
          <div className="campo">
            <label>Título</label>
            <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Resumo do pedido" required />
          </div>
          <div className="campo">
            <label>Descrição</label>
            <textarea className="textarea" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhe sua solicitação…" required />
          </div>
          <div className="row row-fim">
            <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitação'}</button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        <div className="card card-pad"><p className="descricao">Nenhuma solicitação por aqui ainda.</p></div>
      ) : (
        lista.map((s) => (
          <SolicitacaoCard key={s.id} s={s} ehCoordenador={ehCoordenador} aoResponder={carregar} />
        ))
      )}
    </>
  );
}

function SolicitacaoCard({ s, ehCoordenador, aoResponder }) {
  const [resposta, setResposta] = useState(s.resposta || '');
  const [status, setStatus] = useState(s.status);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    setErro(''); setSalvando(true);
    try { await api.responderSolicitacao(s.id, { resposta, status }); aoResponder(); }
    catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 12 }}>
      <div className="entre" style={{ marginBottom: 6 }}>
        <h3>{s.titulo}</h3>
        <span className={`badge ${STATUS_BADGE[s.status]}`}>{STATUS_ROTULO[s.status]}</span>
      </div>
      <div className="descricao" style={{ marginBottom: 8 }}>
        {s.autor?.nome} · {fmtDataHora(s.criadoEm)}
      </div>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: s.resposta || ehCoordenador ? 12 : 0 }}>{s.descricao}</p>

      {s.resposta && !ehCoordenador && (
        <div className="alerta alerta-info">
          <b>Resposta{s.respondidoPor?.nome ? ` de ${s.respondidoPor.nome}` : ''}:</b>
          <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{s.resposta}</div>
        </div>
      )}

      {ehCoordenador && (
        <div style={{ borderTop: '1px solid var(--linha)', paddingTop: 12, marginTop: 4 }}>
          {erro && <div className="alerta alerta-erro" style={{ marginBottom: 10 }}>{erro}</div>}
          <div className="campo">
            <label>Resposta</label>
            <textarea className="textarea" value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Escreva a resposta ao colaborador…" />
          </div>
          <div className="row row-fim" style={{ alignItems: 'center' }}>
            <select className="input" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ABERTA">Aberta</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="RESOLVIDA">Resolvida</option>
            </select>
            <button className="btn btn-primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
