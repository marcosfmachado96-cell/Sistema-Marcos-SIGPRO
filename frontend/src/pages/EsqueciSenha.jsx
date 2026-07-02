import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Logo } from '../components/Logo';

export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.esqueciSenha(email);
      setEnviado(true);
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
            <h2 className="acesso-frase">Recupere o acesso à sua conta.</h2>
          </div>
        </div>
      </div>

      <div className="acesso-form">
        <form className="box" onSubmit={aoEnviar}>
          <h1>Esqueceu a senha?</h1>
          <p className="sub">Informe seu e-mail cadastrado para receber o link de redefinição.</p>

          {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

          {enviado ? (
            <div className="alerta alerta-info" style={{ marginBottom: 16 }}>
              Se o e-mail estiver cadastrado, enviamos um link de redefinição. Verifique também a caixa de spam.
            </div>
          ) : (
            <>
              <div className="campo">
                <label htmlFor="email">E-mail</label>
                <input id="email" className="input" type="email" autoComplete="username"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primario btn-bloco" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar link de redefinição'}
              </button>
            </>
          )}

          <div className="acesso-linha" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link to="/login" className="link-fraco">Voltar ao login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
