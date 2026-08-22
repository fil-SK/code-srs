// @itera/core - the shared, platform-neutral product engine.
//
// One public entry point on purpose: the package manifest has no `exports`
// map, so consumers reach exactly this barrel and never a path inside the
// package. Keeping the surface single and boring is what lets Vite, Vitest and
// (later) Metro all resolve it the same way, through ordinary npm workspace
// package resolution rather than three bundler-specific aliases.
//
// This file began as src/types/index.ts, the web app's type barrel, which is
// why it is `export *` per module rather than a hand-maintained name list.
// Unlike that barrel it re-exports values as well as types: `richText` and
// `CARD_SCHEMA_VERSION` are part of the card contract, and a shared package
// that omitted them would force every consumer to reach past it.
export * from './types/common'
export * from './types/card'
export * from './types/deck'
export * from './types/draft'
export * from './types/roadmap'
export * from './types/review'
