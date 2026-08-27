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
// The registry is the seam's other half: core owns the Repository contract and
// the hooks that read through it, and owns no way to build one. Each platform
// entry point calls configureRepository() at boot.
// Dexie stays in the web app; the Supabase backend is portable because it takes
// a ready client rather than building one. data/supabase/fakeSupabaseClient.ts
// is deliberately absent: it is a test double, and the one test that needs it
// from outside the package reaches it by source path instead.
export * from './data/repository'
export * from './data/registry'
export * from './data/backup'
export * from './data/supabase/SupabaseRepository'

// ---- authentication: the mode rule, the session model, the React binding -----
// The audit P1-3 invariant (authentication mode follows repository mode) is a
// pure function here, tested once, so no platform can answer "am I signed in?"
// its own way. Storage technology, the Supabase client, the environment read,
// the route guard and the sign-in screen all stay with each application, and
// arrive as an AuthConfig at composition time.
export * from './auth/types'
export * from './auth/localSession'
export * from './auth/resolveAuthState'
export * from './auth/authEngine'
export * from './auth/AuthProvider'

// ---- shared data access: query keys + the TanStack hooks over the seam -------
// React-but-not-DOM, so they run unmodified on React Native. They live here
// rather than once per platform because duplicating them would duplicate `qk`,
// the invalidation policy, and usePersistReviewResult's `updatedAt:
// log.reviewedAt` subtlety that makes a retried commit byte-identical.
// QueryClient construction and the provider stay in each application.
export * from './hooks/queryKeys'
export * from './hooks/useBackup'
export * from './hooks/useCards'
export * from './hooks/useDecks'
export * from './hooks/useDrafts'
export * from './hooks/useReview'
export * from './hooks/useRoadmaps'

// ---- content: one interpretation of the Itera text syntax --------------------
// Parsing is shared; rendering is not. These modules turn a card's persisted
// text into semantic nodes and never build markup, so the web renderer and a
// future native renderer map the same tree onto their own elements instead of
// re-tokenizing the syntax two ways. The image policy lives here for the same
// reason: it is a rule about persisted content, not about one platform's <img>.
export * from './content/richTextNodes'
export * from './content/parseRichText'
export * from './content/plainText'
export * from './content/imageSource'

// ---- design identity ---------------------------------------------------------
// The brand palette, radii and font roles as values a platform without CSS can
// read. src/index.css stays the web's rendering source; a drift test there
// asserts the two agree. Layout mechanics are deliberately absent.
export * from './design/tokens'

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

export * from './domain/decks/deckForm'
export * from './domain/decks/deletion'
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

// ---- interaction behavior: what each interaction means, minus how it looks --
// The contract plus the six behavior descriptors. `isResponseReady`,
// `autoGrade` and the semantic `widthFor` decide when a card can be submitted,
// what it scores and how much room its content needs - none of which may be
// re-derived per platform, because a second implementation changes what the
// learner is taught without failing a test. The Views stay platform-specific
// and each platform binds them to these objects in its own registry.
export * from './interactions/types'
export * from './interactions/walkthroughState'
export * from './interactions/recall'
export * from './interactions/multipleChoice'
export * from './interactions/writeCode'
export * from './interactions/ordering'
export * from './interactions/matching'
export * from './interactions/walkthrough'

export * from './charts/retentionChartPath'

export * from './today/greetings'
