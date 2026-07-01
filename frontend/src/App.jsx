import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { AceiteConvite } from './pages/AceiteConvite';
import { PainelUsuario } from './pages/PainelUsuario';
import { NovoRelatorio } from './pages/NovoRelatorio';
import { PainelCoordenador } from './pages/PainelCoordenador';
import { DetalheRelatorio } from './pages/DetalheRelatorio';
import { Convites } from './pages/Convites';
import { Solicitacoes } from './pages/Solicitacoes';

// Exige sessão; opcionalmente restringe a um perfil.
function Protegido({ children, perfil }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (perfil && usuario.perfil !== perfil) {
    return <Navigate to={usuario.perfil === 'COORDENADOR' ? '/coordenador' : '/relatorios'} replace />;
  }
  return <AppShell>{children}</AppShell>;
}

function Inicio() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={usuario.perfil === 'COORDENADOR' ? '/coordenador' : '/relatorios'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/aceite-convite" element={<AceiteConvite />} />

          <Route path="/" element={<Inicio />} />

          {/* Usuário convidado */}
          <Route path="/relatorios" element={<Protegido perfil="USUARIO"><PainelUsuario /></Protegido>} />
          <Route path="/relatorios/novo" element={<Protegido perfil="USUARIO"><NovoRelatorio /></Protegido>} />

          {/* Coordenador */}
          <Route path="/coordenador" element={<Protegido perfil="COORDENADOR"><PainelCoordenador /></Protegido>} />
          <Route path="/convites" element={<Protegido perfil="COORDENADOR"><Convites /></Protegido>} />

          {/* Detalhe — ambos os perfis (o acesso por relatório é validado no backend) */}
          <Route path="/relatorios/:id" element={<Protegido><DetalheRelatorio /></Protegido>} />

          {/* Solicitações — ambos os perfis */}
          <Route path="/solicitacoes" element={<Protegido><Solicitacoes /></Protegido>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
