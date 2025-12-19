import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const defaultPort = 4210;
  const configuredPort = Number(process.env.VITE_PORT) || defaultPort;

  return {
    plugins: [react()],
    server: {
      host: process.env.VITE_HOST || '0.0.0.0',
      port: configuredPort,
      proxy: {
        '/api': {
          target: process.env.VITE_API_GATEWAY_URL || 'http://localhost:4100',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
