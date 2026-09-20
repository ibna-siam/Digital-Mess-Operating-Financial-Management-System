import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[vite proxy api error]', err.message);
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[vite proxy socket error]', err.message);
          });
        },
      },
    },
  },
});
