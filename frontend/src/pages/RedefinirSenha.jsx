import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Logo } from '../components/Logo';

export function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function aoRedefinir(e) {
    e.preventDefault();
    setErro('');
    if (senha.length < 8) return setErro('A senha deve ter ao menos 8 caracteres.');
    if (senha !== senha2) return setErro('As senhas não conferem.');
    setEnviando(true);
    try {
      await api.redefinirSenha(token, senha);
      setConcluido(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acesso">
      <div className="acesso-arte">
        <div className="acesso-arte-fundo" />
        <div className="acesso-arte-veu" />
        <div className="acesso-arte-conteudo">
          <Logo size={44} variante="escuro" />
          <div className="acesso-hero">
            <span className="acesso-traco" />
            <h2 className="acesso-frase">Defina uma nova senha para continuar.</h2>
          </div>
        </div>
      </div>

      <div className="acesso-form">
        {!token ? (
          <div className="box">
            <h1>Link inválido</h1>
            <p className="sub">Este link de redefinição está incompleto.</p>
            <a className="btn btn-secundario" href="/login">Ir para o login</a>
          </div>
        ) : concluido ? (
          <div className="box">
            <h1>Senha redefinida</h1>
            <p className="sub">Você já pode entrar com a nova senha. Redirecionando…</p>
          </div>
        ) : (
          <form className="box" onSubmit={aoRedefinir}>
            <h1>Redefinir senha</h1>
            <p className="sub">Escolha uma nova senha para sua conta.</p>

            {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

            <div className="campo">
              <label htmlFor="s1">Nova senha <span className="dica">(mín. 8 caracteres)</span></label>
              <input id="s1" className="input" type="password" autoComplete="new-password"
                value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="s2">Confirmar senha</label>
              <input id="s2" className="input" type="password" autoComplete="new-password"
                value={senha2} onChange={(e) => setSenha2(e.target.value)} required />
            </div>

            <button className="btn btn-primario btn-bloco" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Redefinir senha'}
            </button>

            <div className="acesso-linha" style={{ justifyContent: 'center', marginTop: 16 }}>
              <Link to="/login" className="link-fraco">Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
