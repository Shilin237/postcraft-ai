import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
      '/api/linkedin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/image': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth/linkedin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
