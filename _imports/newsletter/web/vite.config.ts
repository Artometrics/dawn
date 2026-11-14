import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@newsletter/markdown': fileURLToPath(new URL('../functions/src/markdown.js', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5291',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
  },
});
