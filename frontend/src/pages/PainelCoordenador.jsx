import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { StatusBadge } from '../components/Pipeline';
import { ROTULOS } from '../estados';
import { fmtMoeda, fmtPeriodo } from '../util';

const FILTROS_ESTADO = ['EM_ANALISE', 'AGUARDANDO_ATESTO', 'APROVADO', 'REPROVADO', 'CORRECAO_DOCUMENTAL', 'CONCLUIDO'];

export function PainelCoordenador() {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState(null);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState({ estado: '', contratada: '', de: '', ate: '' });

  function carregar() {
    setRelatorios(null);
    api.listarRelatorios(filtros).then(setRelatorios).catch((e) => setErro(e.message));
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  function set(c, v) { setFiltros((f) => ({ ...f, [c]: v })); }

  // Destaque: o que exige ação do coordenador.
  const pendentes = (relatorios || []).filter((r) => ['EM_ANALISE', 'AGUARDANDO_ATESTO'].includes(r.estado));

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Coordenação · CO 036/2022 DOP</div>
          <h1>Fila de relatórios</h1>
          <div className="descricao">
            {relatorios
              ? `${pendentes.length} aguardando sua ação (análise ou atesto).`
              : 'Carregando…'}
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row">
          <div className="campo" style={{ margin: 0, minWidth: 180 }}>
            <label>Status</label>
            <select className="input" value={filtros.estado} onChange={(e) => set('estado', e.target.value)}>
              <option value="">Todos</option>
              {FILTROS_ESTADO.map((e) => <option key={e} value={e}>{ROTULOS[e]}</option>)}
            </select>
          </div>
          <div className="campo" style={{ margin: 0, minWidth: 180 }}>
            <label>Responsável</label>
            <input className="input" value={filtros.contratada} onChange={(e) => set('contratada', e.target.value)} placeholder="Nome ou empresa" />
          </div>
          <div className="campo" style={{ margin: 0 }}>
            <label>De</label>
            <input className="input" type="date" value={filtros.de} onChange={(e) => set('de', e.target.value)} />
          </div>
          <div className="campo" style={{ margin: 0 }}>
            <label>Até</label>
            <input className="input" type="date" value={filtros.ate} onChange={(e) => set('ate', e.target.value)} />
          </div>
          <div style={{ alignSelf: 'flex-end' }} className="row">
            <button className="btn btn-primario" onClick={carregar}>Filtrar</button>
            <button className="btn btn-secundario" onClick={() => { setFiltros({ estado: '', contratada: '', de: '', ate: '' }); setTimeout(carregar, 0); }}>Limpar</button>
          </div>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {relatorios && relatorios.length === 0 && (
        <div className="card card-pad vazio">
          <div className="vazio-titulo">Nada na fila</div>
          <p>Nenhum relatório corresponde aos filtros atuais.</p>
        </div>
      )}

      {relatorios && relatorios.length > 0 && (
        <div className="card">
          <table className="tabela">
            <thead>
              <tr>
                <th>Medição</th>
                <th>Nº do contrato</th>
                <th>Responsável</th>
                <th>Período</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {relatorios.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/relatorios/${r.id}`)}>
                  <td className="col-num">Nº {r.numMedicao}</td>
                  <td>{r.contrato}</td>
                  <td>{r.autor?.nome || '—'}</td>
                  <td>{fmtPeriodo(r.periodoInicio, r.periodoFim)}</td>
                  <td className="col-valor">{fmtMoeda(r.valor)}</td>
                  <td><StatusBadge estado={r.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
