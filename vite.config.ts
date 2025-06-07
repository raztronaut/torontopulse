import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/toronto-open-data': {
        target: 'https://ckan0.cf.opendata.inter.prod-toronto.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/toronto-open-data/, ''),
        secure: true,
        headers: {
          'User-Agent': 'TorontoPulse/1.0'
        }
      },
      '/api/toronto-secure': {
        target: 'https://secure.toronto.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/toronto-secure/, ''),
        secure: true,
        headers: {
          'User-Agent': 'TorontoPulse/1.0'
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}) 