
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    include: ['html2pdf.js']
  },
  build: {
    commonjsOptions: {
      include: [/html2pdf.js/, /node_modules/]
    }
  }
})
