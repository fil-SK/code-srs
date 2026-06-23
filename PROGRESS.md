# code-srs — Progress Log

A running log of what we build and change, newest first. Each entry notes the
milestone, what changed, and the commit it maps to. See [DESIGN.md](./DESIGN.md)
for the architecture and [mockup.html](./mockup.html) for the visual reference.

## How we work
- Changes are grouped into **milestones** (M0–M8, see DESIGN.md §10).
- After each logical change, a **commit checkpoint** is called out with a ready
  commit message. Format: [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`, `test:`).
- Nothing is committed automatically — the message is provided for you to run.

---

## Decisions added after initial design
- **Flip-to-reveal animation** for self-graded cards (Basic, Code Reading, Bug
  Finding): tapping the card rotates it to show the answer, then the grade bar
  appears. Tall code snippets use a smooth slide/expand reveal instead of a 3D
  flip (flip is awkward for long content on mobile). Finalize per-type in M3.

---

## Log

### 2026-06-23 — M0: project scaffold
- Vite 8 + React 19 + TypeScript 6 project initialized (template `react-ts`).
- Linting via `oxlint` (Vite's current default, replaces ESLint).
- Merged scaffold into repo root; kept DESIGN.md / PROGRESS.md / mockup.html / README.md.
- Renamed package to `code-srs`. `npm run build` passes (tsc + vite build clean).
- **Still in M0:** Tailwind + shadcn/ui setup, folder structure, router, PWA, deploy.

### 2026-06-23 — M0: Tailwind v4 + theme system
- Installed `tailwindcss` + `@tailwindcss/vite` (v4); added plugin to vite.config.ts.
- Added `@` → `src` path alias (vite + tsconfig).
- Ported mockup palette into runtime CSS variables in `index.css`; mapped to
  Tailwind tokens via `@theme inline` so utilities (`bg-panel`, `text-muted`,
  `border-border`, …) swap live when `[data-theme]` flips.
- Dark mode via `[data-theme="dark"]` on `<html>` (default dark), not media query.
- Replaced stock starter `App.tsx`/`App.css`/demo assets with a themed placeholder
  that toggles dark/light to prove the system. Build passes.
- **Still in M0:** shadcn-style primitives, folder structure, router + AppShell, PWA, deploy.

### 2026-06-23 — M0: folder structure + Router + AppShell
- Installed `react-router-dom`, `clsx`, `tailwind-merge`, `lucide-react`.
- Created the DESIGN.md §8 skeleton: `app/`, `components/{layout,ui,code,markdown}/`,
  `features/{dashboard,review,cards,drafts,stats,settings,decks}/`,
  `domain/{scheduling,grading,search,io}/`, `data/`, `hooks/`, `lib/` (.gitkeep for empties).
- `lib/cn.ts` (clsx + tailwind-merge); `app/theme.tsx` (ThemeProvider + useTheme,
  persists to localStorage, default dark); `app/providers.tsx` (QueryClient added in M1).
- AppShell: desktop sidebar + mobile bottom-nav + sticky topbar (title/sub from a
  shared `navItems` config) + theme toggle + "Study now". Matches the mockup layout.
- React Router with 6 routes (Dashboard/Review/Browse/Drafts/Stats/Settings), each a
  `PagePlaceholder` stub noting its target milestone.
- No-flash inline theme script in index.html; removed stock `App.tsx`.
- Build passes; oxlint clean. **M0 remaining:** PWA + first deploy.

### 2026-06-23 — M0: PWA setup (M0 complete; deploy deferred)
- Installed `vite-plugin-pwa`; configured manifest (name, theme/bg `#0b0e14`,
  standalone, `icon.svg`) with `registerType: autoUpdate`, `injectRegister: auto`.
- Added `public/icon.svg` brand mark; ignored `dev-dist/`.
- Build emits `sw.js`, `manifest.webmanifest`, Workbox precache (6 entries) →
  app is installable + offline-capable.
- **Deployment deferred** by choice — will set up (provider TBD) when going live.
- ✅ **M0 done.** Next: M1 (data seam + Basic card).

### 2026-06-23 — M1: domain types + Repository interface
- Added `lib/id.ts` (`newId()` via crypto.randomUUID).
- Domain entity types in **`src/types/`** (common, card, deck, draft, review) with a
  barrel `index.ts`. **Deviation from DESIGN §8:** entities live in a shared
  `src/types/` rather than `features/cards/types/`, because Card/Deck/Draft/ReviewLog
  are tightly coupled (Card embeds SchedulingState; Repository touches all) and a
  shared location avoids cross-feature import cycles. DESIGN updated to match.
- `Card` is the discriminated union from DESIGN §3; added `CardOfType<T>` helper.
- `data/repository.ts`: the storage seam — `CrudRepo<T>` (incl. `bulkPut` for import),
  `CardRepo` (`getDue`, `search`), `ReviewRepo`, and the `Repository` aggregate.
- Build + oxlint clean. Next: DexieRepository (IndexedDB implementation).

### 2026-06-23 — M1: DexieRepository (IndexedDB)
- Installed `dexie`.
- `data/dexie/db.ts`: `AppDB` (v1) with tables cards/decks/drafts/reviewLogs.
  Indexes: cards `id, deckId, type, *tags, scheduling.due`; decks `id, parentId, name`;
  drafts `id, createdAt`; reviewLogs `id, cardId, reviewedAt`. Booleans not indexed
  (IndexedDB keys can't be boolean) — `suspended` filtered in memory.
- `domain/search/searchableText.ts`: exhaustive switch flattening each card type's
  content to a search string (compile error forces handling new types).
- `data/dexie/DexieRepository.ts`: implements the `Repository` seam. Generic `crud()`
  helper (`getAll/getById/put/bulkPut/delete`); `getDue` (index by due date + in-memory
  filters, sorted by due); `search` (in-memory filter, sorted by updatedAt); review log
  append/forCard/range.
- `data/index.ts`: `getRepository()` factory (the one place that picks the backend).
- Build + oxlint clean. Note: no automated tests yet — Vitest + fake-indexeddb is a
  small dedicated step to schedule. Next: TanStack Query layer + Basic card UI.

### 2026-06-23 — M1: test setup + DexieRepository coverage
- Installed `vitest` + `fake-indexeddb`; added `vitest.config.ts` (node env, `@` alias,
  setup file importing `fake-indexeddb/auto`) and `test` / `test:watch` scripts.
- Excluded `*.test.ts(x)` and `src/test` from the app tsconfig so the prod build skips them.
- `domain/scheduling/state.ts`: `initialSchedulingState(now)` — neutral "new" seed (M2
  wires ts-fsrs to evolve it).
- `DexieRepository.test.ts`: 9 tests covering CRUD/upsert/delete/bulkPut, getDue
  (due/new vs future vs suspended, deck filter, limit, sort), search (text, suspended,
  type, tag), and reviews (append, forCard ordering, range). All green.
- Build + lint + tests pass. Next: TanStack Query layer + Basic card UI.

### 2026-06-23 — M1: TanStack Query layer
- Installed `@tanstack/react-query`; `app/queryClient.ts` (staleTime 30s, no retry, no
  refetch-on-focus — local data only changes via our mutations); wired
  `QueryClientProvider` into `providers.tsx`.
- `domain/cards/factory.ts`: `createCard(input)` fills the envelope (id, timestamps,
  suspended, initial scheduling). `NewCardInput` uses a **distributive Omit** so the
  discriminated `type`<->`content` correlation survives.
- `hooks/queryKeys.ts`: centralized keys for consistent invalidation.
- `hooks/useDecks.ts` (useDecks, useCreateDeck, useSaveDeck, useDeleteDeck) and
  `hooks/useCards.ts` (useCard, useDueCards, useSearchCards, useCreateCard, useSaveCard,
  useDeleteCard) wrapping `getRepository()`; mutations invalidate affected keys.
- Build + lint clean. Next: Basic card UI (create/edit + list) — closes the
  UI -> Query -> repo -> IndexedDB loop end-to-end.

### 2026-06-23 — M1: Basic card end-to-end (M1 complete)
- `components/ui/Button.tsx` (primary/secondary/ghost variants).
- `features/cards/cardTypeMeta.ts`: per-type label + badge color + `getCardTitle()`
  (exhaustive). `CardTypeBadge.tsx` renders the colored badge.
- `features/cards/CardEditorPage.tsx`: Basic Q&A editor (front/back/tags). Create via
  `useCreateCard`; edit via `useSaveCard`; auto-creates an "Inbox" deck on first card
  (proper deck mgmt in M4). Non-Basic edit shows an M3 notice. Type picker + per-type
  editor registry deferred to M3.
- `features/cards/BrowsePage.tsx`: real list from IndexedDB via `useSearchCards`, with
  badges, tags, empty state, and links to new/edit.
- Routes added: `/cards/new`, `/cards/:id/edit`.
- Build + lint + 9 tests pass. **Verified loop:** create card -> persists to IndexedDB
  -> shows in Browse -> survives reload.
- ✅ **M1 done.** Next: M2 (review engine — FSRS + review session).

### 2026-06-23 — M2: FSRS scheduler module
- Installed `ts-fsrs` (v5.4.1).
- Added `learningSteps` to `SchedulingState` (persisted so FSRS short-term learning
  steps survive across sessions; DESIGN §3 updated). `initialSchedulingState` seeds 0.
- `domain/scheduling/scheduler.ts`: pure wrapper mapping our camelCase/Millis/string-state
  <-> ts-fsrs Card (Date/snake_case/State enum). `reviewState(state, rating, now)`,
  `previewStates(state, now)` (per-grade next states for button labels), and
  `buildReviewLog({before, after, ...})` with exact deltas.
- `domain/scheduling/format.ts`: `formatInterval` (<1m / 10m / 2h / 5d / mo / y).
- `scheduler.test.ts`: 5 tests (Good advances reps/due, Again < Easy, preview monotonic,
  log deltas, interval formatting). Total suite: 14 tests, all green.
- Build + lint clean. Next: review session (state machine + GradeBar + wiring).
