const expoPreset = require('jest-expo/jest-preset')

// The mobile test runner, deliberately separate from the root Vitest suite.
//
// Two runners with zero overlapping assertions (master plan D10): core and web
// are proven once under Vitest, and this suite only covers what is native - the
// SecureStore adapter, the auth composition, the sign-in screen and the route
// guard. No core or web test is duplicated here, and nothing here re-asserts
// product semantics that core already owns.
//
// `npx vitest run` never sees these files: its two projects are rooted at
// apps/web and packages/core.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Extend the preset rather than replacing it: its list is what makes Expo's
  // own ESM sources loadable, and rewriting it by hand means silently losing
  // entries on every SDK upgrade. Only the two packages @itera/core pulls in are
  // added. Core itself needs no entry - it resolves through the workspace
  // symlink to packages/core, outside node_modules, so it is transformed like
  // our own source.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.startsWith('/node_modules/(?!')
      ? pattern.replace('(?!(', '(?!(@supabase|ts-fsrs|')
      : pattern,
  ),
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
}
