import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { LogoMark } from './Logo';

function Icone({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const ICONES = {
  medicoes: ['M6 3h9l3 3v15H6z', 'M15 3v3h3', 'M9 12h6', 'M9 16h6'],
  relatorios: ['M4 6h6l2 2h8v11H4z'],
  convites: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  solicitacoes: ['M4 5h16v10H8l-4 4z'],
};

export function AppShell({ children }) {
  const { usuario, sair, ehCoordenador } = useAuth();
  const navigate = useNavigate();
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('tema') || 'claro'; } catch { return 'claro'; }
  });

  function alternarTema() {
    const novo = tema === 'escuro' ? 'claro' : 'escuro';
    setTema(novo);
    try { localStorage.setItem('tema', novo); } catch { /* ignora */ }
    document.documentElement.setAttribute('data-tema', novo);
  }

  function aoSair() { sair(); navigate('/login'); }

  const inicial = (usuario?.nome || '?').trim().charAt(0).toUpperCase();
  const linkCls = ({ isActive }) => 'nav-item' + (isActive ? ' ativo' : '');

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-topo">
          <LogoMark size={40} />
          <div className="sidebar-marca">
            <div className="sm-titulo">DER/PR</div>
            <div className="sm-sub">SUPERVISÃO</div>
            <div className="sm-contr">CO 036/2022 DOP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {ehCoordenador ? (
            <>
              <NavLink to="/coordenador" className={linkCls}><Icone d={ICONES.medicoes} /> Medições</NavLink>
              <NavLink to="/convites" className={linkCls}><Icone d={ICONES.convites} /> Convites</NavLink>
              <NavLink to="/solicitacoes" className={linkCls}><Icone d={ICONES.solicitacoes} /> Solicitações</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/relatorios" className={linkCls}><Icone d={ICONES.medicoes} /> Medições</NavLink>
              <NavLink to="/solicitacoes" className={linkCls}><Icone d={ICONES.solicitacoes} /> Solicitações</NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-rodape">
          <LogoMark size={26} />
          <div>
            <div className="sr-titulo">Sistema de Supervisão</div>
            <div className="sr-sub">Gestão de relatórios de medição e fiscalização rodoviária.</div>
          </div>
        </div>
      </aside>

      <div className="painel">
        <header className="topbar">
          <Link to="/" className="topbar-home" title="Início">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /></svg>
          </Link>
          <div className="spacer" />
          <button className="btn-tema" onClick={alternarTema} title="Alternar tema">
            {tema === 'escuro'
              ? <><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/></svg> Claro</>
              : <><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12.8A8 8 0 1111 3a6.5 6.5 0 0010 9.8z"/></svg> Escuro</>}
          </button>
          <div className="user">
            <div className="user-info">
              <div className="nome">{usuario?.nome}</div>
              <div className="papel">{ehCoordenador ? 'COORDENADOR' : 'RESPONSÁVEL'}</div>
            </div>
            <div className="avatar">{inicial}</div>
            <button className="btn-sair" onClick={aoSair}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8V6a2 2 0 00-2-2H5v16h7a2 2 0 002-2v-2"/><path d="M18 12H9M15 9l3 3-3 3"/></svg>
              Sair
            </button>
          </div>
        </header>
        <main className="conteudo">{children}</main>
      </div>
    </div>
  );
}
