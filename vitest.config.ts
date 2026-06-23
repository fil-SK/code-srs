import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Standalone test config (no app plugins like PWA needed). Mirrors the '@' alias.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
