import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export function AceiteConvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [estado, setEstado] = useState('validando'); // validando | ok | invalido
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) { setEstado('invalido'); return; }
    api.validarConvite(token)
      .then((r) => { setEmail(r.email); setEstado('ok'); })
      .catch((e) => { setErro(e.message); setEstado('invalido'); });
  }, [token]);

  async function aoAceitar(e) {
    e.preventDefault();
    setErro('');
    if (senha.length < 8) return setErro('A senha deve ter ao menos 8 caracteres.');
    if (senha !== senha2) return setErro('As senhas não conferem.');
    setEnviando(true);
    try {
      await api.aceitarConvite(token, nome, senha);
      navigate('/login');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acesso">
      <div className="acesso-arte">
        <div className="marca">DER/PR<small>Supervisão · CO 036/2022 DOP</small></div>
        <div>
          <div className="faixa-via" />
          <p className="frase">Você foi <b>convidado</b> a integrar a fiscalização de medições.</p>
        </div>
        <div className="rodape">Defina sua senha para ativar o acesso.</div>
      </div>

      <div className="acesso-form">
        {estado === 'validando' && <div className="carregando">Validando convite…</div>}

        {estado === 'invalido' && (
          <div className="box">
            <h1>Convite inválido</h1>
            <p className="sub">{erro || 'Este convite expirou ou já foi utilizado.'}</p>
            <a className="btn btn-secundario" href="/login">Ir para o login</a>
          </div>
        )}

        {estado === 'ok' && (
          <form className="box" onSubmit={aoAceitar}>
            <h1>Ativar acesso</h1>
            <p className="sub">Convite para <b>{email}</b></p>

            {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

            <div className="campo">
              <label htmlFor="nome">Nome completo</label>
              <input id="nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="s1">Senha <span className="dica">(mín. 8 caracteres)</span></label>
              <input id="s1" className="input" type="password" autoComplete="new-password"
                value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="s2">Confirmar senha</label>
              <input id="s2" className="input" type="password" autoComplete="new-password"
                value={senha2} onChange={(e) => setSenha2(e.target.value)} required />
            </div>

            <button className="btn btn-primario btn-bloco" disabled={enviando}>
              {enviando ? 'Ativando…' : 'Ativar acesso'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
