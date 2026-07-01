import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, encaminha /api para o backend (porta 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
