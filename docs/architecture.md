# Architecture reference

The canonical technical architecture: **how the system is structured**, and which structural rules must not be broken. It is written to be read in pieces — jump to the section you need.

It deliberately does **not** track implementation status ("what shipped last week"). For that, read [`CURRENT_STATE.md`](CURRENT_STATE.md).

This complements, but doesn't replace:
- **[`CURRENT_STATE.md`](CURRENT_STATE.md)** — what is actually built right now, what is placeholder, and what to do next.
- **[`itera-decisions.md`](itera-decisions.md)** — the *why* behind every non-obvious architectural call below (append-only log, cited throughout by "D#" number).
- **[`features.md`](features.md)** — product capabilities, route by route.
- **[`design-system.md`](design-system.md)** — colors, tokens, typography, and UI conventions.
- **[`itera-migration-plan.md`](itera-migration-plan.md)** — the data-migration contract for schema changes that touch real user data.
- **[`../CLAUDE.md`](../CLAUDE.md)** / **[`../AGENTS.md`](../AGENTS.md)** — terse working rules for coding agents; both point here.

---

## Architectural principles

Five constraints shape everything below. Breaking one of them is a decision, not a refactor.

1. **Local-first.** Card authoring, review, scheduling, search, history, import/export and previews all work with **no network and no account**. Dexie/IndexedDB is the default backend; Supabase is opt-in cloud sync, never a prerequisite. AI is optional external tooling (see [`prompts/ai-card-prompt.md`](prompts/ai-card-prompt.md)) and never a runtime dependency.
2. **One storage seam.** The entire app depends on the `Repository` interface and never learns which backend is live.
3. **Layer separation.** `UI components → hooks (application/use-case) → domain models + scheduler boundary → repositories`. FSRS math, persistence and UI state must not share a component. Everything under `src/domain/` is pure and React-free.
4. **History is immutable and separate.** `ReviewLog` is an append-mostly record that no feature rewrites. Scheduling currently lives *on* the `Card` rather than in its own entity: the half-built `CardState` extraction was removed with the card-model convergence because nothing read it. Separating content from learning state again is a real requirement for any future shared or purchased deck, but it is then a deliberate schema change with a migration, not an assumption the code already satisfies.
5. **No destructive data change without an explicit, dry-runnable cutover.** Additive first; removal is always a separate, later, separately-decided step.

---

## Repository map

```
src/
├── app/          router.tsx, RouteError.tsx, theme.tsx (ThemeContext/ThemeProvider/useTheme)
├── auth/         session boundary: AuthProvider, AuthGate, RequireAuth, localSession
├── components/
│   ├── layout/   AppShell, TopNav, primaryNavLinks.ts, AccountMenu(+Content), StreakBadge, useNavBadges.ts
│   ├── ui/       Button, Field, FloatingPanel, dialogs — shared, generic UI primitives
│   ├── code/     CodeView, CodeEditor, LazyCodeView, LazyCodeEditor, languageExtensions/languageList
│   └── text/     RichText, InlineText (the markdown-subset renderer)
├── data/         repository.ts (the interface), index.ts (getRepository), dexie/, supabase/, backup.ts
├── domain/       pure logic, no React:
│   ├── cards/        factory.ts (createCard)
│   ├── decks/        tree.ts (nesting/flattening helpers)
│   ├── grading/      one grade*/matches* fn per v2 interaction type
│   ├── io/           backup.ts (versioned envelope), validateBackupEntities.ts
│   │                 (structural card/deck/review-log validation), backupFixtures.ts
│   ├── migration/    runner.ts (the contract; nothing implements it today)
│   ├── scheduling/   scheduler.ts (ts-fsrs wrapper), reviewService.ts, state.ts, format.ts
│   ├── search/       searchableText.ts
│   └── stats/        calendarDay.ts, dateRange.ts, progressMetrics.ts, streak.ts,
│                      learned.ts, todayMetrics.ts, deckMetrics.ts, cardDeckIndex.ts,
│                      reviewHistory.ts
├── features/
│   ├── cards/          the authoring UI — see "Card creation" below
│   ├── design-preview/ /design-preview/review/* only: six fixture routes that import the
│   │                   production ReviewSessionScreen, so they cannot drift from /review
│   ├── library/        LibraryBrowserPage (/decks), LibraryCollectionView, LibraryDeckPage (/decks/:id), collectionTree.ts (UI-only Collection derivation over Deck.parentId; the leaf/parent split itself lives in domain/decks/tree.ts), DeckRow, DeckSettings, FilterMenu, shared/ (LibraryShell, CollectionNav, CollectionNavDrawer, CardTable, CardListFooter, DeckMark, MasteryRing, MeterBar, EmptyState, Stat, RowFilterDropdown, sortDecks, useIsWideLibrary)
│   ├── preview/        PreviewPage — flip through cards, no scheduling impact (renders the v2 shell)
│   ├── review/         ReviewPage, useSessionQueue.ts (the queue snapshot), ReviewSessionV2
│   ├── reviewV2/        the actual v2 Review shell — see "Card v2 / migration" below
│   ├── roadmaps/       RoadmapsPage, RoadmapEditorPage, RoadmapCanvas (hand-built SVG) — hidden from primary nav, route/data preserved
│   ├── settings/       AccountSettingsPage, SettingsNav, settingsSections.ts, sections/*
│   └── today/          TodayPage (the only fetcher), SuggestedSessionHero, MomentumPanel,
│                        ContinueLearningList, PaceChart, AdjustSessionDialog, greetings.ts —
│                        renders through the shared AppShell, no separate TodayShell
├── hooks/        one file per entity + queryKeys.ts — see "Data access hooks"
├── lib/          cn.ts (clsx+twMerge), id.ts (newId), lazyWithRetry.ts
├── test/         setup.ts (global Vitest setup)
└── types/        card.ts (the one Card model), deck.ts, review.ts, roadmap.ts
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

  // Whole-workspace import. Only the backend knows whether five stores can be
  // written as one unit, so the operation and its guarantee both live here.
  readonly importGuarantee: 'transactional' | 'best-effort'
  replaceAll(snapshot: WorkspaceSnapshot): Promise<void>
  mergeAll(snapshot: WorkspaceSnapshot): Promise<void>
}
```

`replaceAll`/`mergeAll` are the **only** multi-store write on the seam, added because import is the only operation that touches every store at once and must not be able to half-apply. `importGuarantee` is a capability, not a backend name: `'transactional'` means a failure leaves storage exactly as it was, `'best-effort'` means the write is a sequence that can stop halfway. Callers report the difference rather than assuming one, and no UI code branches on which backend is live.

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

**Dexie backend** (`src/data/dexie/db.ts` + `DexieRepository.ts`) — the database is named `'itera'`; it was renamed from `'code-srs'` when the card models converged, and `db.ts` fire-and-forget `Dexie.delete('code-srs')`s the superseded prototype database to reclaim its storage. (The *backup file's* `app` marker is a separate thing and deliberately still reads `code-srs` — see "Backup" below.) Schema is additive/incremental:

```ts
// Database 'itera'. Version 1 is the unified-card baseline.
this.version(1).stores({
  cards: 'id, deckId, *tags, scheduling.due',
  decks: 'id, parentId, name',
  drafts: 'id, createdAt',
  reviewLogs: 'id, cardId, reviewedAt',
  roadmaps: 'id, title',
})

// Prototype ReviewLogs cannot recover the required pre-grade state. This
// data-only upgrade clears that table while preserving cards and decks.
this.version(2).upgrade((tx) => tx.table('reviewLogs').clear())
```

Each `version()` call declares only new/changed stores — Dexie carries the rest forward. `*tags` is a multi-entry index; `scheduling.due` is a nested-keypath index letting `getDue()` query `db.cards.where('scheduling.due').belowOrEqual(now)` directly. Booleans (`suspended`) aren't indexed — IndexedDB can't index them — so suspension is filtered in memory.

> **Gotcha:** any Dexie schema change needs a new `version()` bump, declaring only the new/changed stores.

**Supabase backend** (`src/data/supabase/SupabaseRepository.ts`) — every table stores the whole entity as an opaque `data jsonb` column (mirroring Dexie's "plain object" model exactly), plus a few **generated columns** so hot queries can be indexed (`due`, `suspended`, `deck_id` on `cards`; `card_id`, `reviewed_at` on `review_logs`). `getDue`/`search` push what they can to SQL (`.eq('suspended', false).lte('due', now)`) and do the rest — deck/tag/interaction/text filtering — **in memory, identically to Dexie**, so results match regardless of backend. Row Level Security scopes every query to `auth.uid()`. `supabase/migrations/0003_review_log_state_before.sql` is the clean break for analytics: it deletes prototype `review_logs` and adds a check requiring `data.stateBefore` to be one of the four scheduling states. It has not been verified against a live Supabase project.

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
}
```

Parameterized keys (`cardsDue`, `cardsSearch`) embed the query object itself, so TanStack Query's structural equality naturally separates cache entries per filter combination.

| Hook file | Exports | Notes |
|---|---|---|
| `useCards.ts` | `useCard`, `useDueCards`, `useSearchCards`, `useCreateCard`, `useSaveCard`, `useDeleteCard`, `useMoveCard`, `useReorderCards`, plus one `useSave*Card` per interaction type | `useSaveCard` also toggles `suspended`. `useMoveCard` drops manual `order` on move. `useReorderCards` bulk-assigns sequential `order`, preserving `updatedAt` (reordering isn't an edit). |
| `useDecks.ts` | `useDecks`, `useCreateDeck`, `useSaveDeck`, `useDeleteDeck` | Plain CRUD over `CrudRepo<Deck>`. |
| `useDrafts.ts` | `useDrafts`, `useDraft`, `useCreateDraft`, `useDeleteDraft` | `useDrafts` sorts newest-first client-side. |
| `useReview.ts` | `useReviewLogs`, `useGradeCard`, `usePersistReviewResult`, `useUndoGrade` | The grading write path — see "Scheduling" below. |
| `useRoadmaps.ts` | `useRoadmaps`, `useRoadmap`, `useCreateRoadmap`, `useSaveRoadmap`, `useDeleteRoadmap` | `useSaveRoadmap` is the **only** hook using `qc.setQueryData` for an optimistic write, alongside invalidation. |
| `useBackup.ts` | `useImportBackup` | `onSuccess: () => qc.invalidateQueries()` with no key filter — appropriate after a bulk multi-entity replace/merge. |

Conventions observed across all of them: query keys always go through `qk`, never inlined; every mutation is a thin async function calling 1+ repo methods directly (no separate service layer for plain CRUD); `onSuccess` invalidates the coarse list key and, where relevant, the specific item key.

---

## Entities

| Entity | Type file | Repo | Dexie table | Supabase table | Tree/graph helpers |
|---|---|---|---|---|---|
| **Card** | `src/types/card.ts` | `CardRepo` (`getDue`/`search` + CRUD) | `cards` | `cards` (+ generated `deck_id`, `due`, `suspended`) | — (flat, filtered by deck/tag/interaction) |
| **Deck** | `src/types/deck.ts` | `CrudRepo<Deck>` | `decks` | `decks` | `src/domain/decks/tree.ts`: `buildDeckTree`, `descendantIds`, `subtreeIds`, `flattenDeckTree` |
| **Draft** | `src/types/draft.ts` | `CrudRepo<Draft>` | `drafts` | `drafts` | none — the drafts UI was deleted, the data retained (see `CURRENT_STATE.md` §15) |
| **ReviewLog** | `src/types/review.ts` | `ReviewRepo` (bespoke) | `reviewLogs` | `review_logs` (+ generated `card_id`, `reviewed_at`) | — (stats derived purely from logs, never denormalized). Required `stateBefore` records the pre-grade scheduling state; existing `state` is the resulting post-grade state. Carries optional `dueAfter`; rows written before that older field existed can still render an em dash. |
| **Roadmap** | `src/types/roadmap.ts` | `CrudRepo<Roadmap>` | `roadmaps` | `roadmaps` | hand-rolled SVG canvas in `src/features/roadmaps/` (no graph library) |

A `ReviewLog` stores only a `cardId`, so deck attribution always joins through the current card. Retention series and Review history use `src/domain/stats/cardDeckIndex.ts`'s `buildCardDeckMap(cards)`; Deck Performance takes current cards directly because it also needs active-card, Learned and Due membership. A moved card follows its current deck, while a deleted card's log remains in Review history but contributes to no current deck row.

Adding a whole new entity = a `CrudRepo<T>` line in each backend + a Dexie `version()` bump + a Supabase table (with RLS + grant) + a hook + a `queryKeys` entry + inclusion in `src/domain/io/backup.ts`'s `BackupData`/`src/data/backup.ts`.

**Backup format** (`src/domain/io/backup.ts`, `BACKUP_VERSION = 2`): `{app: 'code-srs', version, exportedAt, data: {cards, decks, drafts, reviewLogs, roadmaps?}}`. `roadmaps` is optional so older v2 backups still import. `BACKUP_APP_MARKER` is the constant behind that `app` field: it is a **legacy backup-format identifier, not the product name**, and must stay `'code-srs'` so files exported before the Itera rebrand still import — do not rename it during branding cleanup.

**Import safety runs in three layers, and none may be skipped:**

1. `parseBackup()` (pure) rejects a version newer than the app supports **and** a version below `MIN_SUPPORTED_BACKUP_VERSION` (2), then calls `src/domain/io/validateBackupEntities.ts` (`assertValidDecks`, `assertValidCards`, `assertValidReviewLogs`, `assertValidDrafts`, `assertValidRoadmaps`) — **every array the import writes**, since an entity IndexedDB cannot key is enough to fail a write. The hand-written validator checks each card's current shape and every ReviewLog field needed by analytics, including required `stateBefore`, post-grade `state`, rating, timestamps and before/after scheduling numbers. A version-2 backup with empty `reviewLogs` remains valid; a nonempty prototype backup lacking `stateBefore` is rejected. `roadmaps` stays optional so older v2 exports still import, but a present one must be a list and every element is validated. Roadmap node/edge ids and `node.deckId` are checked for presence but deliberately **not** resolved, for the same reason `deck.parentId` is not. The envelope version stays 2 because the array already existed and the AI-card workflow exports it empty; stricter validation of an already-required shape is not a format change.
2. `importBackup()` (`src/data/backup.ts`) applies the one rule that needs repository state: every `card.deckId` must resolve. Under **Merge** that means the file's decks *plus* the decks already in the library; under **Replace**, the file's decks only, since replace discards the library first. It runs **before** any write. `deck.parentId` is deliberately *not* checked referentially — `useDeleteDeck` does not reparent children and `collectionTree.ts` already tolerates a dangling parent, so rejecting one would refuse a legitimate export.
3. The write itself goes through `repo.replaceAll()` / `repo.mergeAll()`, because validation alone can never prevent a quota, IndexedDB or network failure mid-write. On **Dexie** both are one `db.transaction('rw', …)` over all five stores: if anything inside rejects, IndexedDB rolls the whole scope back — including the clears — so a failed replace cannot leave an empty, partial or mixed workspace. Snapshot-and-restore was rejected as the alternative because the restore can fail too. On **Supabase** there is no transaction spanning PostgREST requests, so `replaceAll` is **refused outright** rather than emulated, and the Import / Export section hides the mode (`canReplaceImport()`); Merge remains available and is additive. Failure copy is decided in one place, `src/domain/io/importFailure.ts` (`ImportFailure` + `describeImportFailure`), which never surfaces raw IndexedDB text and never claims data survived unless the backend guaranteed it. See the 2026-08-22 entry in `itera-decisions.md`.

`src/domain/io/backupFixtures.ts` holds a valid deck, a valid draft, roadmap and ReviewLog, plus one valid card of every interaction type. It lives in a non-test module on purpose: `tsconfig.app.json` excludes `*.test.ts`, so a fixture written inline in a test can rot silently (`src/data/backup.test.ts` carried a deleted v1 card shape for exactly that reason).

---

## The card model

`src/types/card.ts` defines exactly one `Card`:

```ts
{ id, schemaVersion, deckId, prompt, tip?, explanation?, interaction, tags,
  createdAt, updatedAt, suspended, scheduling, order? }
```

Content and scheduling live together on the one record. `interaction` is a discriminated union on `type` with six members: `recall`, `multiple_choice`, `write_code`, `ordering`, `matching`, `walkthrough`.

**There is no second card model and no on-read migration.** The v1 8-type union, the `CardV2`/`CardV2Record` content-vs-record split, `migrateCard`, and the separate `cardsV2` store were all deleted when the two models converged (see `itera-decisions.md`). Prototype card data was discarded rather than migrated, and the Dexie database was renamed `code-srs` -> `itera`; version 2 later added the ReviewLog-only clean break described above.

### Adding an interaction

Compiler-enforced touchpoints first; the build fails until each is handled.

1. `src/types/card.ts` — add the interface and a member to the `CardInteraction` union.
2. `src/domain/search/searchableText.ts` — add a `case`; its `never` guard fails the build until you do.
3. `src/features/reviewV2/interactions/<type>/` — a `View` component plus an `index.ts` exporting an `InteractionDefinition`.
4. `src/features/reviewV2/interactions/registry.ts` — register it. **The registry is `Partial<...>`, so a missing entry throws at runtime rather than failing the build** — this is the one step the compiler does not enforce.
5. `src/domain/grading/<type>.ts` — a grader, if the type auto-grades (Recall does not; it is self-graded).
6. `src/domain/cards/<type>Form.ts` — form state, `<type>FormToRecord`, `cardRecordTo<Type>Form`, `validate<Type>Form`, `empty<Type>Form`.
7. `src/domain/cards/save<Type>Card.ts` — the save path, plus `useSave<Type>Card` in `src/hooks/useCards.ts`.
8. `src/features/cards/` — `<Type>EditorShell`, `<Type>Fields`, `<Type>LivePreview`, a `CardTypeChooser` tile, and arms in `CardCreatePage` + `CardEditEntry`.
9. `src/features/cards/shared/interactionTypeMeta.ts` — label, icon and tile colour (`features/library/shared/rowVisuals.ts` reads this for table rows).

---

## Routing

`src/app/router.tsx` uses `createBrowserRouter` with **three structurally separate top-level entries** (not one nested tree) — since the App Shell convergence milestone (2026-07-27), Today and Review have swapped places in this list relative to earlier docs:

1. `{ path: '/', element: <AppShell />, children: [...] }` — a **pathless layout route** whose `index` child is `TodayPage` (Today no longer has its own separate shell — see below), plus `decks` and `decks/:id` (`LibraryBrowserPage`/`LibraryDeckPage`), `decks/:deckId/cards/new`, `roadmaps`, `roadmaps/:id`, `preview`, `cards/:id/edit` (a v2 editor shell per type — see "Card creation" below), `cards/:id/study`, `progress`, `settings`, `settings/:section`. All children resolve at the top level with unchanged URLs. An unmatched path renders `RouteError`'s 404 branch.
2. `{ path: 'review', element: <ReviewPage /> }` — a separate top-level entry, **not** nested under `AppShell`. Before this milestone `/review` was actually a plain `AppShell` child (full sidebar chrome and all, contrary to earlier docs); it is now genuinely chrome-free by construction.
3. `{ path: 'design-preview', children: [...] }` — one `index` route plus exactly six fixture routes, `review/{recall,multiple-choice,write-code,ordering,matching,walkthrough}`, each rendering the **production** `ReviewSessionScreen`. The `library`, `library-empty` and `library/:deckId` preview routes and their whole adapted fork were deleted (D180).

`AppShell` (`src/components/layout/AppShell.tsx`) wraps its subtree in `IteraSurface` → `TopNav` (logo, `Today · Library · Progress`, then a `rightSlot` holding `StreakBadge` + `AccountMenu`; there is deliberately no global Search or `+Create`, both removed as unscoped actions) → `<Outlet/>` — no sidebar, no bottom nav, no per-route topbar (`Sidebar.tsx`/`BottomNav.tsx`/`navItems.ts`/`PageHeaderOverride.tsx` were all deleted, not deprecated in place). Standard children render inside the centered, padded 1280px `<main>`; `/preview` and `/cards/:id/study` switch that main to full-width with zero top padding so `ReviewTopBar` can sit flush beneath `TopNav` and paint a full-bleed strip without viewport-unit overflow. This is the mechanism by which every route it wraps picks up the Itera visual system and the shared nav automatically, since pages already use the shared semantic Tailwind classes `.itera-scope` re-points. There is no theme toggle at all — the app is light-only and `ThemeToggle.tsx` was deleted.

`AccountMenu` (`src/components/layout/AccountMenu.tsx`) is the shell's only global right-side action: an avatar button (`aria-haspopup="menu"`, `aria-expanded`, "Open account menu") opening a 300px anchored, viewport-height-capped popover through `FloatingPanel` with `manageFocus`, or — below 480px (`useIsNarrowShell`) — the same `AccountMenuContent` in a bottom sheet. It is grouped quick navigation (account/preferences; study/FSRS/import; keyboard/help; What's new/About; sign out). **Account settings, Import / Export and Sign out are the live rows** — Sign out whenever any session exists, local, demo or Supabase — while every unbuilt row is an `aria-disabled` placeholder marked "Soon". **Spaced repetition (FSRS) is one of those placeholders**: it used to link to `/settings/card-scheduling`, which is not a slug in `settingsSections.ts`, so `resolveSection` silently landed the user on Profile. Its header block shows only what a session actually knows (the email, or "Demo workspace"; plus where the data lives) — there is no profile record and therefore no display name. Since it is mounted from `AppShell`, `/review` has no account menu by construction.

### Auth / session boundary

`src/auth/` owns the entire concept of "signed in," in four files:

- **`RequireAuth.tsx`** — a **single pathless layout route** in `router.tsx` wrapping every product route (the whole `AppShell` tree *and* `/review`). Signed-out visitors are redirected to `/login` carrying the route they wanted. `/login` and `/design-preview/*` sit outside it. "Signed out" is therefore answered in exactly one place, never per page.
- **`AuthProvider.tsx`** — **authentication mode follows repository mode.** It reads the same `isSupabaseConfigured` predicate `getRepository()` selects the backend with, so exactly one auth model is active: Supabase configured means only a Supabase session is a session; otherwise only a `LocalSession` is. A session belonging to the inactive backend never authenticates, is never the `identity`, and a leftover local record is cleared through `clearLocalSession()` once during the Supabase bootstrap — session cleanup only, never touching the IndexedDB workspace. `session` still means the Supabase session specifically and is `null` in local mode. Before this, `isAuthenticated` was `session !== null || local !== null`, which let a stale `itera.session` admit someone to a Supabase-backed app with no Supabase user (audit P1-3).
- **`AuthGate.tsx`** — blocks only on the Supabase session bootstrap. It does not decide what renders. Because a local record is never adopted in Supabase mode, nothing renders authenticated while that bootstrap is still pending.
- **`localSession.ts`** — the **single storage seam for auth**: one key (`itera.session`), `localStorage` when "Remember me" is checked and `sessionStorage` otherwise, every access wrapped in `try/catch`, a corrupt value reading as signed out. **Do not add a session or `localStorage` auth check anywhere else in the app.**

Local mode is gated: a fresh browser lands on `/login` and must sign in or continue with a demo workspace. **In local mode the password is a dev/demo shell — never stored, sent or verified.** With Supabase configured, the only real authentication is magic-link OTP: the password field and Remember me are hidden and the button mails a link. No password authentication exists anywhere in this codebase.

`IteraSurface`/`ForceLightTheme` (`src/features/reviewV2/components/`) are the shared root used by `AppShell`, `PreviewShell` (design-preview), `ReviewPage`/`ReviewSessionV2` and `RouteError` — one mechanism, not separate "real" vs. "preview" copies. See [`docs/design-system.md`](design-system.md) for what they do and why. See `docs/itera-decisions.md`'s "App Shell and Visual Foundation Convergence" entry for the full rationale.

---

## Scheduling

`src/domain/scheduling/scheduler.ts` wraps `ts-fsrs` (`const scheduler = fsrs()`, default params, including short-term learning steps):

- `toCardInput`/`fromCard` — bidirectional adapters between the app's own `SchedulingState` (persisted on `Card.scheduling`; `Millis` numbers, app field names) and `ts-fsrs`'s native `Card`/`CardInput` (`Date` objects, snake_case).
- `reviewState(state, rating, now?)` — applies one grade via `scheduler.next(...)`. The single function that actually advances FSRS state.
- `previewStates(state, now?)` — `scheduler.repeat(...)`, returning what each of the 4 ratings would produce, for labeling the rating buttons with resulting intervals.
- `buildReviewLog(params)` — the single log-construction choke point. It records required `stateBefore: before.state`, preserves `state: after.state`, and assembles the remaining before/after fields from the same explicit pair (not FSRS's internal log).

`src/domain/scheduling/reviewService.ts` is the `ReviewService` boundary spec §9.5 requires ("UI never calls scheduler.ts directly, it goes through this service"):

```ts
interface ReviewService {
  previewNextStates(before, now?): Record<Rating, SchedulingState>
  submit(command: SubmitReviewCommand): Promise<{ after, log }>
}
```

`submit()` computes `{after, log}` and returns them **without persisting anything** — callers persist the result themselves.

`usePersistReviewResult` (used by `ReviewSessionV2` via `reviewService.submit`) takes an already-computed `{after, log}` rather than recomputing it, so the session and the persistence hook can't silently diverge on the FSRS math.

---

## Review sessions: the queue is a snapshot

`/review` accepts two query parameters, neither of them persisted:

| Parameter | Meaning |
|---|---|
| *(none)* | every due card |
| `?deck=<id>` | that deck **and its whole subtree** (`subtreeIds`, `src/domain/decks/tree.ts`) |
| `?limit=<n>` | the first `n` cards of the resolved queue. Parsed by `resolveSessionLimit` (`domain/stats/todayMetrics.ts`): a positive integer, or **no limit**. `0`, negatives, decimals, text and out-of-range values are ignored rather than rejected, so a malformed URL still starts a usable session. |

A later plain `/review` is the default queue again — Today's Adjust session dialog builds these URLs and stores nothing.

**`src/features/review/useSessionQueue.ts` freezes the queue when a session starts.** Everything `ReviewPage` renders below the fetch reads that snapshot, never the live query.

This is load-bearing, not a nicety. Grading invalidates the `cards` query key, `useDueCards` refetches, and the graded card drops out of the due array. When the session was driven by that live array — and keyed on `cards.length` — every grade remounted it: the position reset to the first remaining card, the `X of Y` total shrank (`1 of 5` → `2 of 5` → `2 of 4` → `2 of 3`), the undo stack was lost, and after the last card the empty due list sent `ReviewPage` into its pre-session "Nothing due" state instead of the session's own "All done" screen.

Lifecycle contract:

| Stage | Rule |
|---|---|
| **Created** | when there is no snapshot, or when the resolved `scopeKey` (`deck|limit`) changes because the URL changed in place. Taking a snapshot increments a monotonic `id`. |
| **Lives** | for as long as `ReviewPage` stays mounted on that `scopeKey`. Refetches, invalidations, reordering and shrinking of the live due result are all ignored: the queue, its order, and its total are whatever the session started with. |
| **Ends** | when `ReviewPage` unmounts. Both exits (Exit session, and Back to Today on the completion screen) navigate away from `/review`, so React Router unmounts the route element and the state goes with it. |

That last rule is what makes a *later* session with identical query parameters correct: it is a new mount holding no state, so it resolves the due queue again from current repository state. **`ReviewSessionV2` is keyed on the snapshot `id`, never on `cards.length`** — a genuinely new snapshot is the only thing that may remount a session.

Session identity is deliberately transient and per-mount. The `StudySession` type in `src/types/review.ts` is still unused; nothing here persists a session, and resumable sessions remain out of scope.

---

## Today's statistics boundary

Today computes nothing in a component. `TodayPage` is the only fetcher on the route (`useSearchCards`, `useDueCards`, `useDecks`, `useReviewLogs`, with `now` snapshotted once per mount so it agrees with `/review`); it memoizes calls into `src/domain/stats/` and passes plain props to four presentational panels. `UI → hooks → pure domain → Repository`, with no shortcuts.

- **`streak.ts`** — `computeStreak(logs, now)` → `{ current, best, activeToday }`. **The one streak definition in the product**, consumed by Today's Momentum panel, the top-nav `StreakBadge` and Progress's KPI tile (through `computeKpis`), so the three can present it differently but cannot disagree. Grace behavior: studying through yesterday keeps the streak alive until a full local calendar day is actually missed. Days are compared as calendar-day indices from `calendarDay.ts`, never as elapsed milliseconds, so a run that crosses a DST transition is unbroken.
- **`todayMetrics.ts`** — `summarizeDueQueue`, `estimateSessionMinutes`, `nextDueAt`, `computePaceSeries`, `buildContinueLearning`, `selectNextMilestone`, `resolveSessionLimit`. Pure, `now` always explicit; learned deck summaries call the canonical helper rather than counting separately.
- **`deckMetrics.ts`** — moved here from `src/features/library/`. Today's Continue Learning and Next Milestone need the same per-deck due/last-studied/mastery numbers the Library shows, and `src/domain` may not import from `src/features`.
- **`learned.ts`** — `computeLearned(cards, logs, deckIds?)` is the one unique-current-active-card definition used by Progress, Today milestones and Deck Performance.
- **`progressMetrics.ts`** — `computeRetention(logs)` is the one shared definition for Today and Progress: eligible iff `stateBefore` is `review` or `relearning`; successful iff `rating >= 2` (Hard); `null` when there are no eligible attempts. It also owns the exact Progress KPI, time-bucket, heat-map, retention-series, leaf-deck performance and milestone derivations.
- **`calendarDay.ts`** — **the one home for local calendar-day arithmetic**: `localDayIndex`, `startOfDay` (local midnight, never UTC), `addCalendarDays`, `calendarDaysBetween`, `isSameCalendarDay`, `isNextCalendarDay`, `eachCalendarDay`. Every "previous / next / Nth local day" in the product goes through it, so streaks, the heat map, the pace series, milestones, ranges and the "Yesterday" label share one definition of a day boundary instead of private copies. **A local civil day is not 24 hours** — it is 23 or 25 on the two DST transition days — so adding `86_400_000` ms is never a way to reach the next calendar day, and the old `DAY_MS` export was deleted rather than left available. Elapsed-time arithmetic (FSRS intervals, durations, "in 4 hours", the 30-minute session gap) is a different concept and deliberately stays in milliseconds.
- **`dateRange.ts`** — presets, `buildRange`/`previousPeriod` (`from` inclusive, `to` exclusive, both local midnights stepped by calendar days) and the `Today`/`Yesterday`/absolute event-date formatting, all built on `calendarDay.ts`.

Two definitions worth stating exactly, because the UI copy depends on them:

- **Learned** = a **current, non-suspended card with at least one `ReviewLog`**. Unique cards, not a log count; cards are attributed to the deck they are in *now*. It is never called mastery.
- **Pace** = **reviews completed per local calendar day**, seven buckets ending today, zero-days included. `durationMs` is deliberately not consulted; it backs the session-duration estimate and nothing else.

Progress Deck Performance lists leaf decks only. Every row's Learned, Due and Retention values use the same direct-card leaf scope, avoiding double-counted parent and child rows. Rows exist for every leaf with active cards even if the selected period has no logs, and sort by actionable due work first, then due count, weaker valid retention, recency and name. A due row opens the same `/review?deck=<leaf-id>` scope; Trend was removed because the former review-count chunks looked temporal without being time buckets.

---

## Migration machinery

`src/domain/migration/runner.ts`'s `MigrationRunner` is the contract every data migration must satisfy — `dryRun()`, an idempotent `apply()`, and `rollbackInstructions()`, with `MigrationReport` carrying `beforeCounts`/`afterCounts`/`changed`/`skipped`/`orphans`/`duplicates`/`warnings`.

**Nothing implements it today.** The two migrations that did — `migrateCard` (the on-read v1 adapter) and the `CardState` backfill — were both retired when the card model converged and `CardState` was removed. The contract is kept because the next real migration (the Collection/Deck split) must meet it, and because `CLAUDE.md` names it as the required mechanism. **No migration may run lazily on read**; that exemption existed only for `migrateCard`.

Because Dexie data is client-side, a migration cannot be run from CI or a script — it needs a Settings UI trigger, with Apply gated behind a dry run whose report a human has actually seen in that session (see D44).

### `src/features/reviewV2/` — the v2 Review shell

- `ReviewSessionScreen.tsx` — owns the phase state machine (`reviewPhase.ts`): `presenting -> submitting -> feedback -> rating -> transitioning`, with a `RESET` back to `presenting`. Self-graded types (Recall) skip `submitting`. `ObjectiveResult = {correct: boolean, score?: number}` — `score` supports partial credit (Matching/Ordering/Walkthrough), which v1's `autoGrade` has no equivalent for.
- `components/` — `IteraSurface`/`ForceLightTheme`, an accessible `FlipCard` (the only one; it replaced an earlier shared FlipCard that lacked keyboard/ARIA support, since deleted), `FlashcardSurface`, `TipPanel`/`ExplanationPanel`, `RatingControls`, `ReviewTopBar` (exit, position counter, shortcut hint — no logo/nav/deck metadata, "tested and rejected because they distract from recall"), `InteractionLabel`.
- `interactions/` — one subfolder per v2 type (`recall`, `multipleChoice`, `writeCode`, `ordering`, `matching`, `walkthrough`), each exporting an `InteractionDefinition`. `matching/` renders through `MatchingBoard.tsx`: columns side by side, with each relationship drawn as measured SVG connectors (a chain of hops when the card has two value columns). A Matching card is capped at three columns — `MAX_MATCHING_VALUE_COLUMNS` in `domain/cards/matchingForm.ts`, enforced in `addMatchingColumn`, `validateMatchingForm`, and the editor's Add-column control. A **shared** (`fixed`) column is how one value serves several terms at once; an unshared column stays one-to-one, and assigning its value to another term moves it. See `itera-decisions.md` D118-D127. `ordering/` renders through `OrderingRow.tsx`: each unlocked row is the complete pointer and keyboard drag target, with a decorative 3×4 dot grip at right; see D164-D165. `walkthrough/` shows only the active step's optional tip before its first submission, then that step's optional explanation after submission; card-wide guidance remains owned by `ReviewSessionScreen`. Code-backed Walkthrough cards opt out of the shell's scale/rotation entrance transform so their always-visible CodeMirror content stays crisp. See D166.

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

### Registry shape

`interactions/registry.ts` is a `Partial<{ [T in InteractionType]: InteractionDefinition<T> }>`, not a full `Record`, and `getInteractionDefinition()` **throws at runtime** for a missing type — deliberately, so a future seventh interaction fails loudly instead of silently rendering nothing. It is the one step in "Adding an interaction" the compiler does not catch.

Each type contributes **one** `View` component (not separate Question/Answer components) because a self-graded flip needs one continuous element across the reveal; swapping components at that boundary would break the flip animation. Auto-grading returns `ObjectiveResult = {correct, score?}`, where `score` carries partial credit for Matching/Ordering/Walkthrough.

### Card creation (all six interaction types)

`src/features/cards/` is where the authoring UI lives, built against the one `Card` type and backed by the `cards` repository member above.

- `CardTypeChooser.tsx` — all six interaction tiles, all enabled (`ENABLED` array); Walkthrough was the last to lose its "Coming soon" caption.
- Six thin type shells — `RecallEditorShell.tsx` / `MultipleChoiceEditorShell.tsx` / `WriteCodeEditorShell.tsx` / `OrderingEditorShell.tsx` / `MatchingEditorShell.tsx` / `WalkthroughEditorShell.tsx` — each own only form state, validation/save wiring, their `*Fields.tsx`, and their `*LivePreview.tsx`. Shared composition lives in `CardEditorShell.tsx`; shared Deck/Tags controls live in `CardOrganizeFields.tsx`. The create route wraps them in the locked `add-new-card.png` composition: a top Cancel/divider/**New card** row, one 880px bordered surface, the persistent six-tile chooser, numbered Card content and Organize sections with inset rules, then Save/Cancel in the footer. Recall is selected on first paint. Desktop preview is an opt-in 420px drawer that temporarily expands the surface to 1120px; below `useIsWideEditor`'s ~980px breakpoint, Editor/Preview tabs replace it. The preview still renders the production interaction view through the existing `*LivePreview` components, never a hand-authored lookalike. Walkthrough retains its step-aware preview path.
- `src/domain/cards/{recallForm,multipleChoiceForm,writeCodeForm,orderingForm,matchingForm,walkthroughForm}.ts` — pure conversions between each editor's form state and a `Card`, in both directions (a throwaway preview card, and a persisted record). Each also exports its own `validate*Form` pure validator (e.g. `validateWalkthroughForm` checks shared prompt/scenario, per-step response requirements, and highlighted-range well-formedness against the shared code's actual line count). Walkthrough conversion also round-trips optional per-step tip/explanation fields; missing fields from older blobs hydrate as empty editor values.
- `src/domain/cards/{saveRecallCard,…}.ts` — the single save path per type (unit-tested directly against a repository, independent of the `useSave*Card` hooks that wrap them), each covering two targets: `new` (fresh card) and `existing` (update in place, reusing id/createdAt/scheduling/suspended so `ReviewLog` history keeps resolving).
- `CardEditEntry.tsx` (the element at `cards/:id/edit`) — one switch on `interaction.type` picking the matching editor shell. The switch covers every union member, so the fallthrough is a "Card not found" state reachable only for an id that resolves to no card.
- `CardStudyPreviewPage.tsx` (`cards/:id/study`) — the Deck row's primary click target: the same non-committing `ReviewSessionScreen` embedding as the editor's live preview, dispatched by `card.interaction.type` (`getInteractionDefinition(card.interaction.type)`), seeded from the real record but a fresh scheduling baseline.
  (`CardRowV2.tsx` and `shared/InteractionTypeBadge.tsx` were deleted with the unrouted `DeckDetailPage` that was their only consumer; `features/library/shared/CardTable.tsx` renders both card kinds over a unified `RowMeta`. There is still no separate read-only card detail screen — `CardDetailPage` was built, then removed after hands-on use showed it was just an extra click in front of Study/Edit/overflow; see `itera-decisions.md`.)
- `shared/{StatusBadge,format,interactionTypeMeta,OverflowMenu}.tsx` — the first three promoted into production once a real consumer needed them (they were already built against real `SchedulingStateKind`/`InteractionType`, not fixture types); `OverflowMenu` is a new shared primitive, since two independent ad hoc kebab-menu implementations already existed in the codebase before this one. Its panel is rendered through `src/components/ui/FloatingPanel.tsx` (portal + fixed positioning + flip-above), not as an `absolute` child — see `itera-decisions.md` D112.

Every card authored here is in the real due queue: `ReviewPage`/`useDueCards` read the same single store, so a card of any interaction type is schedulable the moment it is saved.

---

## Grading (`src/domain/grading/`)

One pure function per v2 auto-gradable interaction type, each with a colocated `*.test.ts`. Recall has no grading file — it's self-graded (reveal, then rate yourself).

| File | Grades | Notes |
|---|---|---|
| `matching.ts` | Matching, any number of columns, fixed or unique | `gradeMatching()` → `{correct, score, cells}` |
| `multipleChoice.ts` | Multiple Choice | Exact-set: correct only if every correct option is selected and no incorrect one is. Shared by `autoGrade` and the feedback view so pass/fail and highlighting never drift apart. |
| `ordering.ts` | Ordering | Position-wise — an item is correct only if it's at its authored index, not "valid somewhere." |
| `walkthrough.ts` | Walkthrough, per-step | Dispatches by the step's own `response.type` (`recall` self-graded, `multiple_choice` via `gradeMultipleChoice`, `exact_input` via `writeCode.ts`). |
| `writeCode.ts` | Write Code (v2) | Line-ending normalization + outer-trim + per-line trailing-whitespace trim. The v1 `normalize.ts` it deliberately did **not** reuse (that one collapsed all internal whitespace — too lenient for code, and able to mask indentation bugs) was deleted with the v1 renderers. |

---

## Testing conventions

`vitest.config.ts` sets `environment: 'node'` globally (no DOM, fast) and **blanks `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`** so every test run hits the local Dexie backend via `fake-indexeddb`, regardless of a developer's real `.env.local`. `globals` is not enabled, so every test file imports `describe`/`it`/`expect` explicitly from `vitest`.

Component tests are the exception: opt into a DOM per-file with `// @vitest-environment happy-dom` as the file's first line, and add your own `afterEach(() => cleanup())` — RTL's automatic cleanup never registers without `globals: true`, so renders otherwise accumulate across `it` blocks in that file (a real failure mode, first documented in `itera-decisions.md` D24).

---

## Things that coexist on purpose (not stale code)

- **Two grade-persistence paths**: `src/hooks/useReview.ts`'s `usePersistReviewResult` (what production calls) alongside `src/domain/scheduling/reviewService.ts` (which computes the result). The hook deliberately does not recompute what `reviewService.submit` already did.
- **`src/hooks/useDrafts.ts` with no caller**: the drafts UI was deleted but the `Draft` entity, its Dexie store and its backup array were kept, so the hook is retained rather than removed. Deleting it is the first step toward dropping data that backup files still round-trip.

The earlier entries here are **resolved, not open**: the v1 `ReviewSession`/`useReviewSession` and `src/components/ui/FlipCard.tsx` were deleted on 2026-08-17, and the **two card models** converged into one on 2026-08-18. There is one Review surface, one flip primitive, and one card model.

See `itera-decisions.md` before "cleaning up" anything above.
