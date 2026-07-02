import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, definirToken, definirAoSessaoExpirar } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  });

  const sair = useCallback(() => {
    definirToken(null);
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  // Sessão expirada/token inválido: encerra a sessão. A rota protegida
  // (Protegido, em App.jsx) redireciona ao login assim que usuario vira null.
  useEffect(() => {
    definirAoSessaoExpirar(sair);
    return () => definirAoSessaoExpirar(null);
  }, [sair]);

  const entrar = useCallback(async (email, senha, lembrar) => {
    const r = await api.login(email, senha);
    definirToken(r.token, lembrar);
    (lembrar ? localStorage : sessionStorage).setItem('usuario', JSON.stringify(r.usuario));
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  return (
    <AuthCtx.Provider value={{ usuario, entrar, sair, ehCoordenador: usuario?.perfil === 'COORDENADOR' }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
