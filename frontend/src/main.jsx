import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Aplica o tema salvo antes de renderizar (evita "flash" de tema errado).
try {
  const tema = localStorage.getItem('tema') || 'claro';
  document.documentElement.setAttribute('data-tema', tema);
} catch (e) {
  document.documentElement.setAttribute('data-tema', 'claro');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
