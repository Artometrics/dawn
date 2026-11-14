import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), netlify()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
