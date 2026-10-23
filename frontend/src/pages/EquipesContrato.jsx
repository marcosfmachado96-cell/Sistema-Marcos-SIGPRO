import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { fmtData } from '../util';
import { ROTULO_AREA, fmtPercentual } from '../equipes';
import { MultiSelect } from '../components/MultiSelect';

const OPCOES_AREA = Object.entries(ROTULO_AREA).map(([valor, rotulo]) => ({ valor, rotulo }));

export function EquipesContrato() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState(null);
  const [pessoas, setPessoas] = useState(null);
  const [erro, setErro] = useState('');
  const [filtroArea, setFiltroArea] = useState([]);
  const [verTodas, setVerTodas] = useState(false);

  useEffect(() => {
    api.listarEquipes().then(setContratos).catch((e) => setErro(e.message));
    api.sobreposicoesEquipes().then(setPessoas).catch((e) => setErro(e.message));
  }, []);

  const filtrados = useMemo(
    () => (contratos || []).filter((c) => filtroArea.length === 0 || filtroArea.includes(c.area)),
    [contratos, filtroArea],
  );
  const pessoasVisiveis = pessoas ? (verTodas ? pessoas : pessoas.slice(0, 5)) : [];

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Administração local</div>
          <h1>Equipe por contrato</h1>
          <div className="descricao">Profissionais indicados em cada contrato e conferência de sobreposição entre contratos.</div>
        </div>
        <button className="btn btn-primario" onClick={() => navigate('/equipes/novo')}>Novo contrato</button>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Sobreposição de profissionais {pessoas ? `(${pessoas.length})` : ''}</h3>
        {!pessoas && <div className="carregando">Verificando…</div>}
        {pessoas && pessoas.length === 0 && (
          <div className="alerta alerta-info">Nenhum profissional aparece em mais de um contrato no mesmo período.</div>
        )}
        {pessoasVisiveis.map((p) => (
          <div key={p.nome} style={{ padding: '12px 0', borderTop: '1px solid var(--linha)' }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <b>{p.nome}</b>
              <span className={`badge ${p.excede ? 'badge-vermelho' : 'badge-ambar'}`}>
                {p.excede ? `Soma ${fmtPercentual(p.maiorTotal)} (acima de 100%)` : 'Sobreposição de períodos'}
              </span>
            </div>
            {p.trechos.map((t, i) => (
              <div key={i} className="descricao" style={{ marginBottom: 2 }}>
                {fmtData(t.inicio)} a {fmtData(t.fim)} — {t.contratos.map((c) => `${c.numero} (${fmtPercentual(c.percentual)})`).join(' + ')}
                {' = '}<b style={t.excede ? { color: 'var(--st-vermelho)' } : undefined}>{fmtPercentual(t.total)}</b>
              </div>
            ))}
          </div>
        ))}
        {pessoas && pessoas.length > 5 && (
          <button className="btn btn-secundario btn-sm" style={{ marginTop: 8 }} onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? 'Mostrar menos' : `Ver todos (${pessoas.length})`}
          </button>
        )}
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 12 }}>Contratos {contratos ? `(${filtrados.length})` : ''}</h3>
        <div className="mapa-filtros" style={{ marginBottom: 12 }}>
          <div className="campo">
            <label>Área de gestão</label>
            <MultiSelect opcoes={OPCOES_AREA} selecionados={filtroArea} onChange={setFiltroArea} placeholder="Todas" />
          </div>
        </div>
        {!contratos && <div className="carregando">Carregando…</div>}
        {contratos && filtrados.length === 0 && (
          <p className="descricao">Nenhum contrato cadastrado{contratos.length > 0 ? ' nesta área' : ' ainda'}.</p>
        )}
        {filtrados.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Contrato</th><th>Descrição</th><th>Área</th><th>Vigência</th><th>Equipe</th><th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/equipes/${c.id}`)}>
                    <td className="col-num">{c.numero}</td>
                    <td>{c.descricao}</td>
                    <td>{ROTULO_AREA[c.area]}</td>
                    <td>
                      {fmtData(c.dataInicio)} – {fmtData(c.dataFimVigente)}
                      {c.prorrogado && <> <span className="badge badge-azul">Prazo alterado</span></>}
                    </td>
                    <td>{c.totalMembros}</td>
                    <td>
                      {c.membrosComSobreposicao > 0
                        ? <span className="badge badge-ambar">{c.membrosComSobreposicao} com sobreposição</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
