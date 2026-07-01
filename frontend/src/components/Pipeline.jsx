import { Fragment } from 'react';
import { TRILHA, ANCORA_DESVIO, BADGE, rotulo } from '../estados';

export function StatusBadge({ estado }) {
  return <span className={`badge ${BADGE[estado] || 'badge-azul'}`}>{rotulo(estado)}</span>;
}

// Ícones por etapa da trilha.
const ICONES = [
  <path d="M4 12l16-7-7 16-2-6-7-3z" />,                                  // enviado
  <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>,          // em análise
  <path d="M5 12l4 4 10-10" />,                                            // aprovado
  <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,          // aguardando
  <path d="M6 21V4h11l-2 4 2 4H8" />,                                      // concluído
];

function fmt(d) {
  if (!d) return '--/--/----';
  return new Date(d).toLocaleDateString('pt-BR');
}

// Pipeline "TRAMITAÇÃO" — cartão escuro com a posição do relatório.
// `datas` é um mapa opcional { ESTADO: dataISO }.
export function Pipeline({ estado, versao, datas = {} }) {
  const desvio = Object.keys(ANCORA_DESVIO).includes(estado) ? estado : null;
  const ancora = desvio ? ANCORA_DESVIO[desvio] : estado;
  const idxAtual = TRILHA.indexOf(ancora);

  return (
    <div>
      {desvio && (
        <div className={`alerta ${desvio === 'REPROVADO' ? 'alerta-erro' : 'alerta-ambar'}`} style={{ marginBottom: 12 }}>
          Este relatório está em <b>{rotulo(desvio)}</b>
          {desvio === 'REPROVADO' ? ' — aguarda ajuste e reenvio pelo autor.' : ' — aguarda novo envio de documentos contábeis.'}
        </div>
      )}

      <div className="tramitacao">
        <div className="tram-cab">
          <span className="tram-titulo">TRAMITAÇÃO</span>
          {versao != null && <span className="tram-versao">versão {versao}</span>}
        </div>

        <div className="tram-trilha">
          {TRILHA.map((e, i) => {
            const feito = i < idxAtual;
            const atual = i === idxAtual;
            const cls = ['tram-passo', feito ? 'feito' : '', atual ? 'atual' : '', atual && desvio ? (desvio === 'REPROVADO' ? 'reprovado' : 'desvio') : ''].join(' ');
            return (
              <Fragment key={e}>
                {i > 0 && <div className={`tram-conector ${i <= idxAtual ? 'ativo' : ''}`} />}
                <div className={cls}>
                  <div className="tram-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="tram-circulo">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {ICONES[i]}
                    </svg>
                  </div>
                  <div className="tram-rotulo">{rotulo(e)}</div>
                  <div className="tram-data">
                    {feito || atual ? fmt(datas[e] || (i === 0 ? datas.ENVIADO : null)) : '--/--/----'}
                    {atual && <span className="tram-atual">ATUAL</span>}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
