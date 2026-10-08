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
    projects: [
      // npm test: rápidos, sin red (también en la CI)
      { extends: true, test: { name: 'unit', include: ['tests/**/*.test.ts'], exclude: ['tests/rls/**'] } },
      // npm run test:rls: aislamiento con sesiones reales contra Supabase
      { extends: true, test: { name: 'rls', include: ['tests/rls/**/*.test.ts'], testTimeout: 20_000 } },
    ],
  },
})
