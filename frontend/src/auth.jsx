import { createContext, useContext, useState, useCallback } from 'react';
import { api, definirToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  });

  const entrar = useCallback(async (email, senha) => {
    const r = await api.login(email, senha);
    definirToken(r.token);
    localStorage.setItem('usuario', JSON.stringify(r.usuario));
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const sair = useCallback(() => {
    definirToken(null);
    localStorage.removeItem('usuario');
    setUsuario(null);
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
