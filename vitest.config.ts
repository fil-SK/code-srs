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
    // Force the local Dexie backend in tests regardless of a developer's
    // .env.local, so the suite stays hermetic (no network / Supabase).
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
