
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: './',
    define: {
      // Zabezpečíme, aby process.env.API_KEY bol definovaný aj ako prázdny reťazec, ak v .env chýba
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    optimizeDeps: {
      include: ['html2pdf.js']
    },
    build: {
      commonjsOptions: {
        include: [/html2pdf.js/, /node_modules/]
      }
    }
  }
})
