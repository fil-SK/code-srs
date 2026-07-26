# Architecture reference

Technical reference for how code-srs / Itera is put together: the storage seam, data-access hooks, card-type registries (v1 and v2), routing, scheduling, and migration. Written to be read in pieces — jump to the section you need.

This complements, but doesn't replace:
- **[`CLAUDE.md`](../CLAUDE.md)** — terse rules and gotchas for working in this repo. Read that first if you just need "what to watch out for."
- **[`docs/itera-decisions.md`](itera-decisions.md)** — the *why* behind every non-obvious architectural call below (append-only log, cited throughout by "D#" number).
- **[`docs/features.md`](features.md)** — which pages/routes are v1 vs. the in-progress Itera redesign.
- **[`docs/design-system.md`](design-system.md)** — colors, tokens, typography, and UI-component conventions.

---

## Repository map

```
src/
├── app/          router.tsx, RouteError.tsx, theme.tsx (ThemeContext/ThemeProvider/useTheme)
├── auth/         Supabase magic-link auth: AuthProvider, AuthGate, LoginPage
├── components/
│   ├── layout/   AppShell, Sidebar, BottomNav, navItems.ts
│   ├── ui/       Button, Field, FlipCard (v1) — shared, generic UI primitives
│   ├── code/     CodeView, LazyCodeView, LazyCodeEditor, lineRanges.ts
│   └── text/     RichText, InlineText (the markdown-subset renderer)
├── data/         repository.ts (the interface), index.ts (getRepository), dexie/, supabase/, backup.ts
├── domain/       pure logic, no React:
│   ├── cards/        factory.ts (createCard)
│   ├── decks/        tree.ts (nesting/flattening helpers)
│   ├── grading/      one grade*/matches* fn per v2 interaction type
│   ├── io/           backup.ts (versioned backup envelope + validation)
│   ├── migration/    cardMigration.ts (v1→v2), cardStateBackfill.ts, runner.ts
│   ├── scheduling/   scheduler.ts (ts-fsrs wrapper), reviewService.ts, cardState.ts
│   ├── search/       searchableText.ts
│   └── stats/        computeStats.ts
├── features/
│   ├── cards/          registry/ (v1 CardTypeDefinition registry), renderers/<type>/, BrowsePage, CardEditorPage, cardTypeMeta.ts
│   ├── dashboard/      DashboardPage — the old '/' page; unrouted, still in the tree
│   ├── decks/          DecksPage, DeckDetailPage
│   ├── design-preview/ /design-preview/* routes exercising real v2 components against fixtures;
│   │                   also library-shared/library-browser/library-deck (Phase H preview slice)
│   ├── drafts/         DraftsPage, seedContent.ts
│   ├── preview/        PreviewPage — generic v1 card preview, no scheduling impact
│   ├── review/         ReviewPage, ReviewSessionV2 (production, wraps reviewV2), legacy ReviewSession/useReviewSession (v1, unrouted)
│   ├── reviewV2/        the actual v2 Review shell — see "Card v2 / migration" below
│   ├── roadmaps/       RoadmapsPage, RoadmapEditorPage, RoadmapCanvas (hand-built SVG)
│   ├── settings/       SettingsPage, CardStateMigrationSection
│   ├── stats/          StatsPage
│   └── today/          TodayPage, TodayShell, SuggestedSessionHero, MomentumPanel, ContinueLearningList, PaceChart
├── hooks/        one file per entity + queryKeys.ts — see "Data access hooks"
├── lib/          cn.ts (clsx+twMerge), id.ts (newId), lazyWithRetry.ts
├── test/         setup.ts (global Vitest setup)
└── types/        card.ts (v1 union), cardV2.ts (v2 union), deck.ts, review.ts, roadmap.ts
```

---

## Storage seam

`src/data/repository.ts` defines the one interface the entire app depends on:

```ts
export interface CrudRepo<T> {
  getAll(): Promise<T[]>
  getById(id: ID): Promise<T | undefined>
  put(entity: T): Promise<void>        // upsert
  bulkPut(entities: T[]): Promise<void> // used by import
  delete(id: ID): Promise<void>
  clear(): Promise<void>               // used by replace-import
}

export interface CardRepo extends CrudRepo<Card> {
  getDue(query: DueQuery): Promise<Card[]>
  search(query: CardQuery): Promise<Card[]>
}

export interface ReviewRepo { /* append-mostly: append, bulkPut, delete, all, clear, forCard, range */ }

export interface Repository {
  cards: CardRepo
  decks: CrudRepo<Deck>
  drafts: CrudRepo<Draft>
  reviews: ReviewRepo
  roadmaps: CrudRepo<Roadmap>
  cardStates: CrudRepo<CardState> // CrudRepo's `id` param is CardState.cardId, its natural key
  cardsV2: CardV2Repo // real, persisted CardV2 storage (Phase F) — see "Card creation" below
}
```

Timestamp bookkeeping (`createdAt`/`updatedAt`) is deliberately kept **out** of this layer — it lives in the hooks (see below).

`src/data/index.ts`'s `getRepository()` is the single entry point:

```ts
let instance: Repository | null = null
export function getRepository(): Repository {
  if (!instance) {
    instance = isSupabaseConfigured ? new SupabaseRepository() : new DexieRepository()
  }
  return instance
}
```

A lazily-constructed singleton, chosen purely by whether `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set (`isSupabaseConfigured` in `src/data/supabase/client.ts`). Every hook calls `getRepository()` once at module scope, so the whole app shares one instance.

**Dexie backend** (`src/data/dexie/db.ts` + `DexieRepository.ts`) — database name is still literally `'code-srs'` (not renamed for the rebrand). Schema is additive/incremental:

```ts
this.version(1).stores({
  cards: 'id, deckId, type, *tags, scheduling.due',
  decks: 'id, parentId, name',
  drafts: 'id, createdAt',
  reviewLogs: 'id, cardId, reviewedAt',
})
this.version(2).stores({ roadmaps: 'id, title' })
this.version(3).stores({ cardStates: 'cardId' })
this.version(4).stores({ cardsV2: 'id, deckId, *tags, scheduling.due' })
```

Each `version()` call declares only new/changed stores — Dexie carries the rest forward. `*tags` is a multi-entry index; `scheduling.due` is a nested-keypath index letting `getDue()` query `db.cards.where('scheduling.due').belowOrEqual(now)` directly. Booleans (`suspended`) aren't indexed — IndexedDB can't index them — so suspension is filtered in memory.

> **Gotcha:** any Dexie schema change needs a new `version()` bump, declaring only the new/changed stores.

**Supabase backend** (`src/data/supabase/SupabaseRepository.ts`) — every table stores the whole entity as an opaque `data jsonb` column (mirroring Dexie's "plain object" model exactly), plus a few **generated columns** so hot queries can be indexed (`due`, `suspended`, `deck_id` on `cards`; `card_id`, `reviewed_at` on `review_logs`). `getDue`/`search` push what they can to SQL (`.eq('suspended', false).lte('due', now)`) and do the rest — deck/tag/type/text filtering — **in memory, identically to Dexie**, so results match regardless of backend. Row Level Security scopes every query to `auth.uid()`.

> **Gotcha:** Postgres denies a table before RLS even runs if the table lacks a `grant` — a missing grant is a 403 on every request, not an RLS problem. Every table in `supabase/schema.sql` needs `grant select, insert, update, delete ... to authenticated` alongside its RLS policy.

---

## Data access hooks

All hooks live in `src/hooks/`, call `getRepository()` once at module scope, and wrap calls in TanStack Query 5. Query keys are centralized in `src/hooks/queryKeys.ts`'s `qk` object:

```ts
export const qk = {
  decks: ['decks'],
  cards: ['cards'],
  card: (id) => ['cards', 'byId', id],
  cardsDue: (query) => ['cards', 'due', query],
  cardsSearch: (query) => ['cards', 'search', query],
  reviewsForCard: (cardId) => ['reviews', 'card', cardId], // no hook uses this yet
  reviewsAll: ['reviews', 'all'],
  drafts: ['drafts'],
  draft: (id) => ['drafts', 'byId', id],
  roadmaps: ['roadmaps'],
  roadmap: (id) => ['roadmaps', 'byId', id],
  cardStates: ['cardStates'], // reserved, nothing reads CardState yet
  cardsV2: ['cardsV2'],
  cardV2: (id) => ['cardsV2', 'byId', id],
  cardsV2Search: (query) => ['cardsV2', 'search', query],
}
```

Parameterized keys (`cardsDue`, `cardsSearch`) embed the query object itself, so TanStack Query's structural equality naturally separates cache entries per filter combination.

| Hook file | Exports | Notes |
|---|---|---|
| `useCards.ts` | `useCard`, `useDueCards`, `useSearchCards`, `useCreateCard`, `useSaveCard`, `useDeleteCard`, `useMoveCard`, `useReorderCards` | `useSaveCard` also toggles `suspended`. `useMoveCard` drops manual `order` on move. `useReorderCards` bulk-assigns sequential `order`, preserving `updatedAt` (reordering isn't an edit). |
| `useDecks.ts` | `useDecks`, `useCreateDeck`, `useSaveDeck`, `useDeleteDeck` | Plain CRUD over `CrudRepo<Deck>`. |
| `useDrafts.ts` | `useDrafts`, `useDraft`, `useCreateDraft`, `useDeleteDraft` | `useDrafts` sorts newest-first client-side. |
| `useReview.ts` | `useReviewLogs`, `useGradeCard`, `usePersistReviewResult`, `useUndoGrade` | The grading write path — see "Scheduling" below. |
| `useRoadmaps.ts` | `useRoadmaps`, `useRoadmap`, `useCreateRoadmap`, `useSaveRoadmap`, `useDeleteRoadmap` | `useSaveRoadmap` is the **only** hook using `qc.setQueryData` for an optimistic write, alongside invalidation. |
| `useBackup.ts` | `useImportBackup` | `onSuccess: () => qc.invalidateQueries()` with no key filter — appropriate after a bulk multi-entity replace/merge. |
| `useCardsV2.ts` | `useCardV2`, `useSearchCardsV2`, `useCreateCardV2`, `useSaveCardV2`, `useDeleteCardV2`, `useSaveRecallCard`, `useSaveMultipleChoiceCard` | Plain CRUD over `CardV2Repo`, plus one `useSave*Card` per authorable interaction type — thin wrappers around the pure `src/domain/cardsV2/save{Recall,MultipleChoice}Card.ts` (each unit-tested directly against a repository), which are the only places a legacy v1 card gets migrated to a `CardV2Record` on save. |

Conventions observed across all of them: query keys always go through `qk`, never inlined; every mutation is a thin async function calling 1+ repo methods directly (no separate service layer for plain CRUD); `onSuccess` invalidates the coarse list key and, where relevant, the specific item key.

---

## Entities

| Entity | Type file | Repo | Dexie table | Supabase table | Tree/graph helpers |
|---|---|---|---|---|---|
| **Card** (v1) | `src/types/card.ts` | `CardRepo` | `cards` | `cards` (+ generated `deck_id`, `due`, `suspended`) | — (flat, filtered by deck/tag/type) |
| **Deck** | `src/types/deck.ts` | `CrudRepo<Deck>` | `decks` | `decks` | `src/domain/decks/tree.ts`: `buildDeckTree`, `descendantIds`, `subtreeIds`, `flattenDeckTree` |
| **Draft** | `src/types/draft.ts` | `CrudRepo<Draft>` | `drafts` | `drafts` | conversion via `src/features/drafts/seedContent.ts` |
| **ReviewLog** | `src/types/review.ts` | `ReviewRepo` (bespoke) | `reviewLogs` | `review_logs` (+ generated `card_id`, `reviewed_at`) | — (stats derived purely from logs, never denormalized) |
| **Roadmap** | `src/types/roadmap.ts` | `CrudRepo<Roadmap>` | `roadmaps` | `roadmaps` | hand-rolled SVG canvas in `src/features/roadmaps/` (no graph library) |
| **CardState** (v2, Phase D) | `src/types/cardV2.ts` | `CrudRepo<CardState>` (keyed by `cardId`) | `cardStates` (v3) | `card_states` (unverified against a live DB — see D42) | `src/domain/scheduling/cardState.ts`: `cardStateFromCard`, `cardStatesEqual` |
| **CardV2Record** (v2, Phase F) | `src/types/cardV2.ts` | `CardV2Repo` (`getDue`/`search` + CRUD) | `cardsV2` (v4) | `cards_v2` (+ generated `deck_id`, `due`, `suspended` — same shape as `cards`; unverified against a live DB) | — (flat, filtered by deck/tag; no tree needed) |

Adding a whole new entity = a `CrudRepo<T>` line in each backend + a Dexie `version()` bump + a Supabase table (with RLS + grant) + a hook + a `queryKeys` entry + inclusion in `src/domain/io/backup.ts`'s `BackupData`/`src/data/backup.ts`.

**Backup format** (`src/domain/io/backup.ts`, `BACKUP_VERSION = 1`, still 1 despite `CardV2` existing): `{app: 'code-srs', version, exportedAt, data: {cards, decks, drafts, reviewLogs, roadmaps?, cardStates?, cardsV2?}}`. `roadmaps`/`cardStates`/`cardsV2` are optional so older backups still import. `parseBackup()` rejects a version newer than the app supports and validates the four required arrays are actually arrays.

---

## Card type registry (v1)

`src/types/card.ts` is a discriminated union on `type`, 8 members: `basic`, `mcq`, `codeReading`, `codeCompletion`, `bugFinding`, `ordering`, `matching`, `story`. Each is `CardBase & { type: T; content: TContent }`, where `CardBase` is `{id, deckId, tags, createdAt, updatedAt, order?, suspended, scheduling}`.

`src/features/cards/registry/types.ts`'s `CardTypeDefinition<T>` is everything needed to render/edit/(optionally) auto-grade one type:

```ts
interface CardTypeDefinition<T extends CardType> {
  type: T
  interactive: boolean        // requires a response before reveal (MCQ, ordering, matching)
  reveal?: 'flip' | 'slide'   // 'flip' for short cards, 'slide' (default) for tall/code/interactive
  emptyContent: () => CardOfType<T>['content']
  isComplete: (content) => boolean
  Question: ComponentType<QuestionProps<T>>
  Answer: ComponentType<AnswerProps<T>>
  Editor: ComponentType<EditorProps<T>>
  autoGrade?: (content, response) => { correct: boolean } | null
  isResponseReady?: (response, content) => boolean
}
```

`src/features/cards/registry/index.ts` registers all 8 as a **full** `{ [T in CardType]: CardTypeDefinition<T> }` — a new `CardType` fails to compile until it's registered here. `CardView`, `ReviewSession`, and `PreviewPage` render generically through this registry with no per-type branching.

### Checklist: adding a new v1 card type

| # | What | File | Enforcement |
|---|---|---|---|
| 1 | Add the content interface + union member | `src/types/card.ts` | compiler forces every consumer below to handle it |
| 2 | Author `Question`/`Answer`/`Editor` + register | `src/features/cards/renderers/<type>/`, `src/features/cards/registry/index.ts` | full `Record` — compile error if missing |
| 3 | `getCardTitle` | `src/features/cards/cardTypeMeta.ts` | `switch` + `const _exhaustive: never = card` — true exhaustiveness |
| 4 | `cardTypeMeta` record itself (label + badge class) | `src/features/cards/cardTypeMeta.ts` | full `Record<CardType, ...>` |
| 5 | `searchableText` | `src/domain/search/searchableText.ts` | same `_exhaustive: never` pattern |
| 6 | `seedContent` | `src/features/drafts/seedContent.ts` | **not exhaustive** — ends in `default: return base`, a silent fallback, not a compile error. The one soft spot in this list. |
| 7 | `migrateCard` (if the type should also work in the v2 Review shell) | `src/domain/migration/cardMigration.ts` | `switch` + `_exhaustive: never` |

The Browse filter and editor type picker both derive from `cardTypeMeta`, so they need no separate update.

---

## Routing

`src/app/router.tsx` uses `createBrowserRouter` with **three structurally separate top-level entries** (not one nested tree):

1. `{ path: '/', element: <TodayPage /> }` — Today owns `/` outright, with its own top-nav shell (`TodayShell`), not `AppShell`'s sidebar.
2. `{ element: <AppShell />, children: [...] }` — a **pathless layout route** (no `path` key), so children resolve at the top level with unchanged URLs: `decks`, `decks/:id`, `decks/:deckId/cards/new` (Phase F chooser + Recall editor), `roadmaps`, `roadmaps/:id`, `review`, `preview`, `browse`, `cards/new`, `cards/:id/edit` (branches between the new Recall editor and the old `CardEditorPage` — see "Card creation" below), `cards/:id/study` (Phase F Recall review preview — the Deck row's primary click target), `drafts`, `stats`, `settings`.
3. `{ path: 'design-preview', children: [...] }` — a separate top-level entry (not nested in `AppShell`), one `index` route plus `review/{recall,multiple-choice,write-code,ordering,matching,walkthrough}` and `library`, `library-empty`, `library/:deckId` (the Phase H preview slice, fixture-driven — see [`docs/itera-redesign-plan.md`](itera-redesign-plan.md) Phase H status).

`AppShell` (`src/components/layout/AppShell.tsx`) wraps its subtree in `IteraSurface` (Sidebar + sticky header with a "Study now" CTA + `<Outlet/>` + BottomNav) — this is the mechanism by which every v1 page picks up the Itera visual system automatically, since they already use the shared semantic Tailwind classes `.itera-scope` re-points. `ThemeToggle` is deliberately not rendered (light-only for now).

`IteraSurface`/`ForceLightTheme` (`src/features/reviewV2/components/`) are the shared root used by `AppShell`, `TodayShell`, `PreviewShell` (design-preview), `LibraryPreviewShell` (design-preview/library-shared, the Phase H preview — reuses `IteraSurface` directly, not `PreviewShell`, since its two-pane layout needs Today's wider container and it deliberately omits `PreviewShell`'s "not part of the live app" banner), and `ReviewSessionV2` — one mechanism, not separate "real" vs. "preview" copies. See [`docs/design-system.md`](design-system.md) for what they do and why.

---

## Scheduling

`src/domain/scheduling/scheduler.ts` wraps `ts-fsrs` (`const scheduler = fsrs()`, default params, including short-term learning steps):

- `toCardInput`/`fromCard` — bidirectional adapters between the app's own `SchedulingState` (persisted on `Card.scheduling`; `Millis` numbers, app field names) and `ts-fsrs`'s native `Card`/`CardInput` (`Date` objects, snake_case).
- `reviewState(state, rating, now?)` — applies one grade via `scheduler.next(...)`. The single function that actually advances FSRS state.
- `previewStates(state, now?)` — `scheduler.repeat(...)`, returning what each of the 4 ratings would produce, for labeling the rating buttons with resulting intervals.
- `buildReviewLog(params)` — assembles a `ReviewLog` from explicit before/after state (not FSRS's own internal log), so recorded deltas are exact.

`src/domain/scheduling/reviewService.ts` is the `ReviewService` boundary spec §9.5 requires ("UI never calls scheduler.ts directly, it goes through this service"):

```ts
interface ReviewService {
  previewNextStates(before, now?): Record<Rating, SchedulingState>
  submit(command: SubmitReviewCommand): Promise<{ after, log }>
}
```

`submit()` computes `{after, log}` and returns them **without persisting anything** — there's no `CardV2`/`CardState`-backed read/write cutover yet, so callers persist the result themselves. This shape is designed not to change when that cutover eventually lands (only the internals gain a repository read/write).

`src/hooks/useReview.ts`'s `useGradeCard` (the **v1** path) calls `reviewState`/`buildReviewLog` **directly**, bypassing `reviewService` — known, intentional duplication (see `itera-decisions.md` D26), not yet consolidated. `usePersistReviewResult` (the **v2** path, used by `ReviewSessionV2` via `reviewService.submit`) takes an already-computed `{after, log}` rather than recomputing, so the two paths can't silently diverge on the FSRS math.

### CardState dual-write (Phase D)

`src/domain/scheduling/cardState.ts`'s `cardStateFromCard(card)` is the **only** place `Card.scheduling` + `Card.suspended` get reshaped into a `CardState` row — used identically by every write path and by the backfill migration. Six call sites dual-write (or delete) a matching `CardState` row alongside every `Card.scheduling` write:

`useCreateCard`, `useSaveCard`, `useDeleteCard` (`src/hooks/useCards.ts`) and `useGradeCard`, `usePersistReviewResult`, `useUndoGrade` (`src/hooks/useReview.ts`).

**Nothing reads from `CardState` yet** — `Card.scheduling` remains the sole source of truth for `getDue()` and everywhere else. The dual-write exists purely to keep the new store populated ahead of a later, separate read-cutover step. `src/domain/migration/cardStateBackfill.ts`'s `createCardStateBackfill(repo)` (a `MigrationRunner`) backfills `CardState` rows for cards that predate the dual-write rollout, using `cardStatesEqual()` to report `changed`/`skipped` idempotently.

---

## Card v2 / migration

`src/types/cardV2.ts` defines a **second**, parallel card model living alongside `src/types/card.ts`'s v1 union — not replacing it. Key pieces:

- **`RichContent`** — `{format: 'markdown', value: string}`, built via `richText(value)`.
- **`CardInteraction`** — a 6-member discriminated union on `type`: `RecallInteraction`, `MultipleChoiceInteraction`, `WriteCodeInteraction`, `OrderingInteraction`, `MatchingInteraction`, `WalkthroughInteraction`. V1's separate `basic`/`codeReading`/`bugFinding` *types* collapse into one `recall` interaction, differentiated by an `authoringPreset` tag (`'standard' | 'code_reading' | 'find_the_bug' | 'predict_output' | 'explain_code'`). V1's `story` becomes `walkthrough`, generalized to also support inline multiple-choice/short-answer steps.
- **`CardV2`** — `{id, schemaVersion, deckId, prompt, tip?, explanation?, interaction, tags, createdAt, updatedAt}`.
- **`CardState`** — covered above.
- **`ReviewEvent`** — the v2 successor to `ReviewLog` (adds `sessionId`, `interactionType`, free-form `metadata`). Not yet backed by a repository.
- **`StudySession`** — a v2-only concept (session source + goal). Not implemented anywhere beyond this type.

`src/domain/migration/cardMigration.ts`'s `migrateCard(v1) -> CardV2` is pure, total, and deterministic across all 8 v1 types — **the one migration in the plan explicitly allowed to run lazily on read**, because it's a pure content reshape that never changes where an entity lives or what references it. Everything else that changes storage location or entity identity (CardState extraction, a future Collection/Deck split) must instead implement `src/domain/migration/runner.ts`'s `MigrationRunner` contract:

```ts
interface MigrationRunner {
  dryRun(): Promise<MigrationReport>   // no writes, deterministic
  apply(): Promise<MigrationReport>    // idempotent — re-running shows everything `skipped`
  rollbackInstructions(): string
}
```

Production wiring: `src/features/review/ReviewSessionV2.tsx` migrates each v1 `Card` via `migrateCard()` (memoized per card), renders it through `reviewV2`'s shell, then persists the FSRS result back onto the **original v1 `Card.scheduling`** via `usePersistReviewResult` — there is no `CardV2`-backed store yet, so v2's *content* model is live in production, but its *storage* model isn't.

### `src/features/reviewV2/` — the v2 Review shell

- `ReviewSessionScreen.tsx` — owns the phase state machine (`reviewPhase.ts`): `presenting -> submitting -> feedback -> rating -> transitioning`, with a `RESET` back to `presenting`. Self-graded types (Recall) skip `submitting`. `ObjectiveResult = {correct: boolean, score?: number}` — `score` supports partial credit (Matching/Ordering/Walkthrough), which v1's `autoGrade` has no equivalent for.
- `components/` — `IteraSurface`/`ForceLightTheme`, an accessible `FlipCard` (deliberately separate from `src/components/ui/FlipCard.tsx`, which lacks keyboard/ARIA support), `FlashcardSurface`, `TipPanel`/`ExplanationPanel`, `RatingControls`, `ReviewTopBar` (exit, position counter, shortcut hint — no logo/nav/deck metadata, "tested and rejected because they distract from recall"), `InteractionLabel`.
- `interactions/` — one subfolder per v2 type (`recall`, `multipleChoice`, `writeCode`, `ordering`, `matching`, `walkthrough`), each exporting an `InteractionDefinition`.

`interactions/types.ts`:

```ts
interface InteractionDefinition<T extends InteractionType> {
  type: T
  interactive: boolean
  isResponseReady?: (response, interaction) => boolean
  autoGrade?: (interaction, response) => ObjectiveResult | null
  View: ComponentType<InteractionViewProps<T>>   // ONE component, not three
}
```

`interactions/registry.ts` registers all six as `Partial<{ [T in InteractionType]: InteractionDefinition<T> }>` (not a full `Record`), and `getInteractionDefinition()` **throws at runtime** if a type is missing.

### v2 registry vs. v1 registry — the concrete differences

| | v1 (`cards/registry`) | v2 (`reviewV2/interactions`) |
|---|---|---|
| Components per type | 3 (`Question`, `Answer`, `Editor`) | 1 (`View`, receives the current `ReviewPhase`) — a self-graded flip needs one continuous element across reveal; swapping components at that boundary would break the flip animation |
| Registry shape | full `Record` — missing type is a compile error | `Partial<Record>` — missing type throws at runtime ("so a future 7th type fails loudly instead of silently rendering nothing") |
| Editor / authoring | yes (`Editor` component, `emptyContent`) | Recall and Multiple Choice only, as of Phase F (`src/features/cardsV2/`) — see "Card creation" below. The other four types have no editor yet; authoring for them still happens against v1 `Card`s. |
| Auto-grade result | `{correct: boolean} \| null` | `ObjectiveResult = {correct: boolean, score?: number}` — partial credit |
| Keyed on | `CardType` (8 values, 1:1 with content shape) | `InteractionType` (6 values) — decoupled from the card envelope; `prompt`/`tip`/`explanation` live on `CardV2` itself, not embedded per-type content |

### Card creation (Phase F, Recall + Multiple Choice)

`src/features/cardsV2/` is where the v2 authoring UI lives, built against `CardV2Record` (`src/types/cardV2.ts`) — `CardV2` plus its own embedded `suspended`/`scheduling`/`order`, the same envelope shape v1 `CardBase` uses, backed by the real `cardsV2` repository member above. This is a deliberate, separate store from `CardState` (the Phase D dual-write target) — `CardV2Record`'s scheduling is never read from or written to `cardStates`, so authoring a Recall or Multiple Choice card doesn't touch or advance that migration.

- `CardTypeChooser.tsx` — all six interaction tiles; Recall and Multiple Choice are enabled (`ENABLED` array), the rest render muted with a "Coming soon" caption.
- `RecallEditorShell.tsx` / `MultipleChoiceEditorShell.tsx` — one editor/preview shell per type (structurally identical, not a shared component — see `itera-decisions.md` D71 for why extraction was deferred): `RecallFields.tsx` (prompt/answer/tip/explanation/preset) or `MultipleChoiceFields.tsx` (prompt/tip/explanation/selection-mode/randomize/option list via `MultipleChoiceOptionRow.tsx`, with inline validation) + Deck/Tags on the left, `RecallLivePreview.tsx`/`MultipleChoiceLivePreview.tsx` on the right — which render the *actual* `ReviewSessionScreen`/interaction definition, not a mockup. Recall's preview is keyed on the authoring preset so typing doesn't reset an in-progress flip; Multiple Choice's preview instead has an explicit "Reset preview" button (a local remount-key counter) since it has no preset to key on and a submitted response only clears on remount. Desktop: two-pane grid. Below `useIsWideEditor`'s ~980px breakpoint: Editor/Preview tabs.
- `src/domain/cardsV2/recallForm.ts` / `multipleChoiceForm.ts` — pure conversions between each editor's form state and: a throwaway preview `CardV2`, a persisted `CardV2Record`, and (via `legacyCardToForm`/`legacyMcqCardToForm`, wrapping `migrateCard`) a legacy v1 card being hydrated for edit. `multipleChoiceForm.ts` additionally exports `validateMultipleChoiceForm` (≥2 options, all filled, ≥1 correct, single-select forbids >1 correct — enforced by trimming on the multiple→single transition, not a blocking error).
- `src/domain/cardsV2/saveRecallCard.ts` / `saveMultipleChoiceCard.ts` — the single save path per type (unit-tested directly against a repository, independent of the `useSaveRecallCard`/`useSaveMultipleChoiceCard` hooks that wrap them), each covering three targets: `new` (fresh `CardV2Record`), `v2` (update in place, same id/scheduling), and `v1` (the **legacy cutover** — builds a `CardV2Record` reusing the original v1 card's `id`/`createdAt`/`scheduling`/`suspended` so `ReviewLog` history keeps resolving, writes it to `cardsV2`, then deletes the superseded `cards` row and its `cardStates` mirror).
- `CardEditEntry.tsx` (the element at `cards/:id/edit`) — branches: a `CardV2Record` opens its matching editor by `interaction.type`; a legacy v1 `basic`/`codeReading`/`bugFinding` card opens `RecallEditorShell` and a legacy v1 `mcq` card opens `MultipleChoiceEditorShell`; any other v1 type falls through to the untouched `CardEditorPage`. Legacy cards only migrate to `CardV2Record` when actually edited-and-saved this way — not in bulk.
- `CardStudyPreviewPage.tsx` (`cards/:id/study`) — the Deck row's primary click target: the same non-committing `ReviewSessionScreen` embedding as the editor's live preview, dispatched by `card.interaction.type` (`getInteractionDefinition(card.interaction.type)`), seeded from the real record but a fresh scheduling baseline.
- `CardRowV2.tsx` — the compact Deck-page row, rendered by `DeckDetailPage.tsx` alongside the existing v1 `CardRow` list (two row styles intentionally coexist, same as the two nav shells). The interaction tile reads `card.interaction.type` generically (no per-type branching in the row itself). The row body opens the study preview directly; an inline Edit (pencil) button and an overflow menu (Duplicate/Move/Suspend/Delete, the last two using a local `MovePopover`) live on the row itself — there is no separate read-only detail/overview screen (`CardDetailPage` was built, then removed after hands-on use showed it was just an extra click in front of Study/Edit/overflow, all of which now live one level up; see `itera-decisions.md`).
- `shared/{StatusBadge,format,interactionTypeMeta,InteractionTypeBadge,OverflowMenu}.tsx` — the first four promoted out of `design-preview/library-shared/` once a real consumer needed them (they were already built against real `SchedulingStateKind`/`InteractionType`, not fixture types); `OverflowMenu` is a new shared primitive, since two independent ad hoc kebab-menu implementations already existed in the codebase before this one.

**Known gap:** `CardV2Record`s aren't in the global due queue yet (`useDueCards`/`ReviewPage` only read v1 `cards`) — real, scheduling-affecting review of a `CardV2Record` isn't wired up; only the non-committing editor preview and "Study this Card" exist so far.

---

## Grading (`src/domain/grading/`)

One pure function per v2 auto-gradable interaction type, each with a colocated `*.test.ts`. Recall has no grading file — it's self-graded (reveal, then rate yourself).

| File | Grades | Notes |
|---|---|---|
| `matching.ts` | Matching, any number of columns, fixed or unique | `gradeMatching()` → `{correct, score, cells}` |
| `multipleChoice.ts` | Multiple Choice | Exact-set: correct only if every correct option is selected and no incorrect one is. Shared by `autoGrade` and the feedback view so pass/fail and highlighting never drift apart. |
| `ordering.ts` | Ordering | Position-wise — an item is correct only if it's at its authored index, not "valid somewhere." |
| `walkthrough.ts` | Walkthrough, per-step | Dispatches by the step's own `response.type` (`recall` self-graded, `multiple_choice` via `gradeMultipleChoice`, `exact_input` via `writeCode.ts`). |
| `writeCode.ts` | Write Code (v2) | Line-ending normalization + outer-trim + per-line trailing-whitespace trim. |
| `normalize.ts` | (v1 only, not a grader) | `normalizeCode`/`matchesAnySolution` used by v1's `codeCompletion` renderer. **Deliberately not reused** by v2's `write_code` — v1's normalization collapses all internal whitespace, too lenient for code (could mask indentation bugs). |

---

## Testing conventions

`vitest.config.ts` sets `environment: 'node'` globally (no DOM, fast) and **blanks `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`** so every test run hits the local Dexie backend via `fake-indexeddb`, regardless of a developer's real `.env.local`. `globals` is not enabled, so every test file imports `describe`/`it`/`expect` explicitly from `vitest`.

Component tests are the exception: opt into a DOM per-file with `// @vitest-environment happy-dom` as the file's first line, and add your own `afterEach(() => cleanup())` — RTL's automatic cleanup never registers without `globals: true`, so renders otherwise accumulate across `it` blocks in that file (a real failure mode, first documented in `itera-decisions.md` D24).

---

## Two things that coexist on purpose (not stale code)

- **Two Review UIs**: v1 (`ReviewSession.tsx`/`useReviewSession.ts`) is unreferenced from routing but present and functional; `ReviewPage` routes to `ReviewSessionV2` in production. Reverting is a one-line router change.
- **Two `FlipCard` components**: `src/components/ui/FlipCard.tsx` (v1, no keyboard/ARIA support, a known gap deliberately not fixed in place) and `src/features/reviewV2/components/FlipCard.tsx` (accessible replacement, used everywhere v2 renders).

Both are documented, deliberate states — see `itera-decisions.md` before "cleaning up" either.
