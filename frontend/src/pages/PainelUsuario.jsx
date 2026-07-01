import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { StatusBadge } from '../components/Pipeline';
import { fmtMoeda, fmtPeriodo } from '../util';

export function PainelUsuario() {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.listarRelatorios()
      .then(setRelatorios)
      .catch((e) => setErro(e.message));
  }, []);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Fiscalização de medições</div>
          <h1>Meus relatórios</h1>
          <div className="descricao">Acompanhe o andamento de cada medição até o atesto contábil.</div>
        </div>
        <button className="btn btn-primario" onClick={() => navigate('/relatorios/novo')}>
          Novo relatório
        </button>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {!relatorios && !erro && <div className="carregando">Carregando relatórios…</div>}

      {relatorios && relatorios.length === 0 && (
        <div className="card card-pad vazio">
          <div className="vazio-titulo">Nenhum relatório ainda</div>
          <p>Cadastre a primeira medição para iniciar o fluxo.</p>
          <button className="btn btn-primario" style={{ marginTop: 12 }} onClick={() => navigate('/relatorios/novo')}>
            Novo relatório
          </button>
        </div>
      )}

      {relatorios && relatorios.length > 0 && (
        <div className="card">
          <table className="tabela">
            <thead>
              <tr>
                <th>Medição</th>
                <th>Contrato</th>
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
