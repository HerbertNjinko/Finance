import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: portalPort(process.env.npm_package_name),
    proxy: {
      '/api': {
        target: process.env.VITE_API_GATEWAY_URL || 'http://localhost:4100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});

function portalPort(name?: string) {
  switch (name) {
    case 'institution-portal':
      return 4202;
    case 'regulator-portal':
      return 4203;
    default:
      return 4200;
  }
}
