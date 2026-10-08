/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Publicado en GitHub Pages bajo /soporte-clientes/ (ver .github/workflows/publicar.yml)
export default defineConfig({
  base: '/soporte-clientes/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/rls/**'],
  },
})
