import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
    exclude: ['pdfjs-dist/build/pdf.worker.min.js']
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  define: {
    global: 'globalThis',
  },
  assetsInclude: ['**/*.worker.js', '**/*.worker.mjs'],
  worker: {
    format: 'es'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['pdf-lib'],
          'pdfjs': ['pdfjs-dist'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 0,
    copyPublicDir: true
  }
})