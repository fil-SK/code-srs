import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Two projects, because the two suites have genuinely different bootstraps and
// sharing one was hiding that.
//
// The web setup gives every test file fake-indexeddb and a configured Dexie
// repository. Running @itera/core's tests through it would mean core - the code
// a React Native app also runs - was only ever proven under a web-specific
// bootstrap, with a browser storage shim installed and a backend the package is
// not allowed to know about already registered. A core test that accidentally
// depended on either would pass here and fail under Metro, which is the exact
// class of bug the package boundary exists to catch.
//
// `npx vitest run` still runs both; there is no second command to remember. This
// config stays at the repository root - it is the one runner for both workspaces -
// while each project's `root` points at the package it covers.
const webProject = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src'),
    },
  },
  test: {
    name: 'web',
    root: path.resolve(__dirname, 'apps/web'),
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Component tests opt into a DOM per file with a `// @vitest-environment
    // happy-dom` pragma; everything else stays in Node, which is faster.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Force the local Dexie backend in tests regardless of a developer's
    // .env.local, so the suite stays hermetic (no network / Supabase).
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
}

const coreProject = {
  test: {
    name: 'core',
    root: path.resolve(__dirname, 'packages/core'),
    include: ['src/**/*.test.ts'],
    // No setup file on purpose: no fake-indexeddb, no repository configured,
    // no `@` alias, no VITE_* env. A core test that needs any of those is
    // telling you something about the code it covers.
    environment: 'node',
  },
}

export default defineConfig({
  test: {
    projects: [webProject, coreProject],
  },
})
