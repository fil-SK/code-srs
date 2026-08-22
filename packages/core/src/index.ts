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
//
// One name would collide across the modules below and does not: `leafDecks`
// existed twice, in domain/decks/tree.ts and as a one-line delegation to it in
// library/collectionTree.ts. The delegation is gone, so the deck-tree function
// is the only one, exported once from here.

// ---- entity contracts --------------------------------------------------------
export * from './types'

// ---- storage seam: the contract, the cloud backend, backup orchestration -----
// Dexie stays in the web app; the Supabase backend is portable because it takes
// a ready client rather than building one. data/supabase/fakeSupabaseClient.ts
// is deliberately absent: it is a test double, and the one test that needs it
// from outside the package reaches it by source path instead.
export * from './data/repository'
export * from './data/backup'
export * from './data/supabase/SupabaseRepository'

// ---- platform-neutral utilities ----------------------------------------------
export * from './lib/id'
export * from './lib/shuffle'

// ---- domain ------------------------------------------------------------------
export * from './domain/cards/factory'
export * from './domain/cards/matchingForm'
export * from './domain/cards/multipleChoiceForm'
export * from './domain/cards/orderingForm'
export * from './domain/cards/recallForm'
export * from './domain/cards/saveMatchingCard'
export * from './domain/cards/saveMultipleChoiceCard'
export * from './domain/cards/saveOrderingCard'
export * from './domain/cards/saveRecallCard'
export * from './domain/cards/saveWalkthroughCard'
export * from './domain/cards/saveWriteCodeCard'
export * from './domain/cards/walkthroughForm'
export * from './domain/cards/writeCodeForm'

export * from './domain/decks/languages'
export * from './domain/decks/tree'

export * from './domain/grading/types'
export * from './domain/grading/matching'
export * from './domain/grading/multipleChoice'
export * from './domain/grading/ordering'
export * from './domain/grading/walkthrough'
export * from './domain/grading/writeCode'

export * from './domain/io/backup'
export * from './domain/io/backupFixtures'
export * from './domain/io/importFailure'
export * from './domain/io/validateBackupEntities'

export * from './domain/migration/runner'

export * from './domain/review/reviewPersistFailure'

export * from './domain/scheduling/format'
export * from './domain/scheduling/reviewService'
export * from './domain/scheduling/scheduler'
export * from './domain/scheduling/state'

export * from './domain/search/searchableText'

export * from './domain/stats/calendarDay'
export * from './domain/stats/cardDeckIndex'
export * from './domain/stats/dateRange'
export * from './domain/stats/deckMetrics'
export * from './domain/stats/learned'
export * from './domain/stats/progressMetrics'
export * from './domain/stats/reviewHistory'
export * from './domain/stats/streak'
export * from './domain/stats/todayMetrics'

// ---- pure product helpers that used to live under features/ ------------------
export * from './library/collectionTree'
export * from './library/deckMark'
export * from './library/sortDecks'

export * from './interactions/matchingBadgeGeometry'
export * from './interactions/promptLength'

export * from './charts/retentionChartPath'

export * from './today/greetings'
