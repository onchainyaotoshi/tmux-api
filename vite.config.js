import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  test: {
    exclude: ['packages/**', 'node_modules/**'],
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': '/src/frontend',
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9993',
      '/auth/proxy': 'http://localhost:9993',
      '/docs': 'http://localhost:9993',
    },
  },
})
