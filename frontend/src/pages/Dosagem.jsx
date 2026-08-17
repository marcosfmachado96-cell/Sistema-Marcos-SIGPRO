import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export function Dosagem() {
  const { ehCoordenador } = useAuth();
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.listarDosagem().then(setLista).catch((e) => setErro(e.message));
  }, []);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Revestimento primário</div>
          <h1>Projeto de Dosagem e caracterização de material</h1>
          <div className="descricao">
            {ehCoordenador
              ? 'Projetos de dosagem e caracterização cadastrados pelos colaboradores.'
              : 'Cadastre e acompanhe os projetos de dosagem e caracterização de material.'}
          </div>
        </div>
        {!ehCoordenador && (
          <button className="btn btn-primario" onClick={() => navigate('/dosagem/novo')}>
            Novo projeto
          </button>
        )}
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {!lista && !erro && <div className="carregando">Carregando…</div>}

      {lista && lista.length === 0 && (
        <div className="card card-pad vazio">
          <div className="vazio-titulo">Nenhum projeto cadastrado ainda</div>
          {!ehCoordenador && (
            <>
              <p>Cadastre o primeiro projeto de dosagem/caracterização.</p>
              <button className="btn btn-primario" style={{ marginTop: 12 }} onClick={() => navigate('/dosagem/novo')}>
                Novo projeto
              </button>
            </>
          )}
        </div>
      )}

      {lista && lista.length > 0 && (
        <div className="card">
          <table className="tabela">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Contrato</th>
                <th>Rodovias</th>
                {ehCoordenador && <th>Responsável</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/dosagem/${p.id}`)}>
                  <td>{p.descricao}</td>
                  <td>{p.contrato}</td>
                  <td>{(p.rodovias || []).join(', ')}</td>
                  {ehCoordenador && <td>{p.autor?.nome || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
