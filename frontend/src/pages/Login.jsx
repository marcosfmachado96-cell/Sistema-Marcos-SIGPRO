import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from '../components/Logo';

const DESTAQUES = [
  { rotulo: 'Medições', icone: 'M6 4h9l3 3v13H6z M15 4v3h3' },
  { rotulo: 'Diário de Obra', icone: 'M5 6h14v14H5z M5 10h14 M9 4v4 M15 4v4' },
  { rotulo: 'Relatórios e Fotos', icone: 'M4 8h4l1-2h6l1 2h4v11H4z M12 16a3 3 0 100-6 3 3 0 000 6z' },
  { rotulo: 'Atesto Contábil', icone: 'M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z M9 12l2 2 4-4' },
];

export function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const u = await entrar(email, senha);
      navigate(u.perfil === 'COORDENADOR' ? '/coordenador' : '/relatorios');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acesso">
      {/* Painel esquerdo — arte com a rodovia */}
      <div className="acesso-arte">
        <div className="acesso-arte-fundo" />
        <div className="acesso-arte-veu" />
        <div className="acesso-arte-conteudo">
          <Logo size={44} variante="escuro" />

          <div className="acesso-hero">
            <span className="acesso-traco" />
            <h2 className="acesso-frase">
              Da medição ao <span className="destaque-ambar">atesto contábil,</span><br />
              cada etapa registrada e rastreável.
            </h2>
          </div>

          <div>
            <div className="acesso-destaques">
              {DESTAQUES.map((d) => (
                <div key={d.rotulo} className="acesso-destaque">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e6a52c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={d.icone} />
                  </svg>
                  <span>{d.rotulo}</span>
                </div>
              ))}
            </div>
            <div className="acesso-rodape-arte">
              <span className="acesso-traco-mini" />
              Gestão de relatórios de medição — fiscalização rodoviária.
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="acesso-form">
        <form className="box" onSubmit={aoEntrar}>
          <h1>Entrar</h1>
          <p className="sub">Acesso restrito aos usuários convidados.</p>

          {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <div className="input-icone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
              <input id="email" className="input" type="email" autoComplete="username"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <div className="input-icone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
              <input id="senha" className="input" type="password" autoComplete="current-password"
                value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
          </div>

          <div className="acesso-linha">
            <label className="check"><input type="checkbox" /> Lembrar-me</label>
            <span className="link-fraco">Esqueceu a senha?</span>
          </div>

          <button className="btn btn-primario btn-bloco" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar  →'}
          </button>

          <div className="acesso-nota">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
            Ambiente restrito. Todas as ações são registradas.
          </div>
          <div className="acesso-versao">
            Versão 2.0.1<br />© DER/PR · SIMEMP | NeoConstec
          </div>
        </form>
      </div>
    </div>
  );
}
