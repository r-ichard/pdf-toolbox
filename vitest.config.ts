/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**'  // Exclude E2E tests from Vitest
    ],
    // Note: 3 harmless DOM teardown errors from happy-dom library are expected
    // These do not affect test reliability or application functionality
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})