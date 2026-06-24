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

### 2026-06-23 — M2: review session (M2 complete)
- Added `ReviewRepo.delete(id)` (interface + Dexie) for undo; +1 repo test (now 15 total).
- `hooks/useReview.ts`: `useGradeCard` (compute next scheduling, persist card + append
  log) and `useUndoGrade` (restore original card + delete log).
- `features/review/useReviewSession.ts`: state machine over a snapshotted due-card queue
  (Presenting -> Answered -> Scheduled -> next) with a one-step undo stack and per-card
  timing for ReviewLog.durationMs.
- `features/review/GradeBar.tsx`: Again/Hard/Good/Easy with per-grade interval labels
  from `previewStates` + `formatInterval`.
- `features/review/ReviewSession.tsx`: reveal flow, progress bar, undo, completion screen,
  keyboard shortcuts (Space/Enter reveal; 1-4 grade; U undo). Basic cards render fully;
  other types get a self-graded fallback until M3.
- `features/review/ReviewPage.tsx`: wired to `useDueCards`, with loading / nothing-due states.
- Build + lint + 15 tests pass. **Verified path:** create Basic cards -> Review -> grade ->
  due date advances (card leaves the queue). ✅ **M2 done.** Next: M3 (all card types via
  the renderer registry + flip-to-reveal).

### 2026-06-23 — M3 (a): card renderer registry + Basic on it
- `components/ui/Field.tsx`: shared `Field` wrapper + `fieldClass` for all editors.
- `features/cards/registry/types.ts`: `CardTypeDefinition<T>` (type, interactive,
  emptyContent, isComplete, Question/Answer/Editor components, optional autoGrade) and
  `QuestionProps`/`AnswerProps`/`EditorProps`/`CardResponse`.
- `features/cards/renderers/basic/`: Question, Answer, Editor + `basicDefinition`.
- `features/cards/registry/index.ts`: registry map (Partial during M3 — TODO: tighten to
  full Record for compile-time exhaustiveness at M3 end) + `getCardDefinition` (single
  widening cast; callers stay type-safe) + `isTypeImplemented`.
- `features/cards/CardView.tsx`: dispatcher rendering Question + revealed Answer.
- Refactored `ReviewSession` (uses CardView; threads per-card `response` state) and
  `CardEditorPage` (renders `def.Editor`; page owns deck/tags/type). Removed inline Basic.
- Build + lint + 15 tests pass; Basic behavior unchanged. Next M3 (b): CodeMirror + Code
  Reading / Bug Finding.

### 2026-06-23 — M3 (b): CodeMirror + Code Reading & Bug Finding
- Installed CodeMirror 6 (state/view/language + lang-cpp/python/javascript/rust +
  theme-one-dark). Curated language set (C/C++, Python, JS, TS, Rust, plaintext).
- `components/code/CodeView.tsx`: read-only highlighted display; transparent over
  `--code-bg`; highlight style follows app theme (oneDark vs default).
- `components/code/LazyCodeView.tsx`: React.lazy wrapper so CodeMirror loads on demand.
- Split language module: `languageList.ts` (labels only, for editor select) vs
  `languageExtensions.ts` (grammars, used only by CodeView). This keeps grammars out of
  the main bundle: initial JS dropped from ~1084kB to ~497kB (157kB gz); CodeMirror is a
  ~588kB chunk fetched lazily. (Lazy chunk triggers the >500kB warning — acceptable.)
- `components/code/CodeBlockField.tsx`: language picker + mono textarea for editors.
- Renderers: `codeReading` (code + question -> answer) and `bugFinding` (prompt + code +
  optional progressive hint -> explanation). Both self-graded; registered.
- Added a **card-type picker** to the New Card editor (implemented types only), so the new
  types are creatable.
- Build + lint + 15 tests pass. Next M3 (c): MCQ (first auto-graded type).

### 2026-06-23 — M3 (c): MCQ + auto-grade flow
- Added optional `isResponseReady(response)` to `CardTypeDefinition` (gates the Check
  button for interactive types).
- `renderers/mcq/`: Question (radio/checkbox select; shows correct/incorrect on reveal
  with Check/X markers), Answer (explanation), Editor (prompt, multiple-answer toggle,
  add/remove options with correct markers, explanation). `mcqDefinition` is interactive
  with `autoGrade` (exact-set match) + `isResponseReady` (>=1 selected). Registered.
- **Auto-grade flow in ReviewSession:** interactive cards show "Check answer" (disabled
  until a response is ready); on reveal, `autoGrade` runs, a Correct/Incorrect banner
  shows, and `GradeBar` pre-marks the suggested grade (Good if correct, else Again) with
  a ✓ + ring. User can override any grade; ReviewLog.autoGraded = (chosen === suggested).
  Self-graded types keep "Show answer" with no suggestion.
- `mcq.test.ts`: 5 tests (single/multiple/empty autoGrade, isResponseReady, isComplete).
  Suite now 20 tests, all green. Build + lint clean.
- Next M3 (d): Ordering + Matching (interactive, auto-graded).

### 2026-06-23 — M3 (d): Ordering + Matching
- `lib/shuffle.ts` (Fisher–Yates). Extended `isResponseReady` signature to also receive
  `content` (Matching needs to know all lefts are assigned); existing MCQ fn still valid
  (fewer params). ReviewSession passes `current.content`.
- `renderers/ordering/`: items stored in correct order, presented shuffled (stable per
  card); reorder via up/down controls; reveal marks each position green/red; Answer shows
  the canonical order. autoGrade = exact order match. Editor reorders with up/down.
- `renderers/matching/`: left items fixed, right options shuffled in a per-row select;
  reveal marks rows; Answer lists correct pairs. autoGrade = every left maps to its own
  pair; isResponseReady requires all assigned. Editor manages left↔right pairs.
- Registered both. Tests: ordering (5) + matching (added) → suite now 27, all green.
- Build + lint clean. 6/7 types done. Next M3 (e): Code Completion (editable CodeMirror
  + normalized-match auto-grade), then (f) flip-to-reveal.

### 2026-06-23 — M3 (e): Code Completion + full registry
- Installed `@codemirror/commands`. `components/code/CodeEditor.tsx` (editable CM:
  history, defaultKeymap + indentWithTab; uncontrolled after mount, remount via key) +
  `LazyCodeEditor.tsx`.
- `domain/grading/normalize.ts`: `normalizeCode` (whitespace/case opts) + `matchesAnySolution`.
- `renderers/codeCompletion/`: Question shows read-only scaffold + editable answer (becomes
  read-only CodeView on reveal); Answer shows solution(s) + explanation; Editor has scaffold,
  multiple accepted solutions, validation mode (normalizedMatch | none) + whitespace/case
  toggles, explanation. autoGrade returns null when mode=none (self-graded). 6 tests.
- **Registry now a full `Record<CardType, …>`** — compile-time exhaustiveness; all 7 types
  registered. Removed `isTypeImplemented`; `getCardDefinition` is total. Simplified CardView
  (no fallback) and CardEditorPage (no unsupported branch; type picker lists all types).
- Build + lint + 33 tests pass. CodeEditor is its own lazy 24kB chunk. ✅ all 7 types done.
- Next M3 (f): flip-to-reveal animation, then M3 wrap-up.

### 2026-06-23 — M3 (f): reveal animations (M3 complete)
- Added `reveal?: 'flip' | 'slide'` to `CardTypeDefinition`; `basic` uses `flip`, all others
  default to `slide`.
- `components/ui/FlipCard.tsx` + CSS in index.css: JS-free 3D flip via grid overlap (both
  faces share a cell, container sizes to the taller face — no height measuring). `prefers-
  reduced-motion` disables transitions.
- Slide/fade `reveal-in` keyframe applied to the answer block (CardView) and the slide-mode
  banner/GradeBar.
- ReviewSession branches: flip cards show Question (front, tap/Space to reveal) → Answer +
  GradeBar (back); slide cards keep the stacked reveal. Code-heavy + interactive cards stay
  on slide (flip is janky for tall content), per the design note.
- Build + lint + 33 tests pass. ✅ **M3 complete** — all 7 card types, auto-grade flow, and
  reveal animations done. Next: M4 (decks, tags, search, browse polish + card delete).

### 2026-06-23 — M4 (a): Browse search, filters, suspend, delete
- Rebuilt `BrowsePage`: text search (deferred via useDeferredValue), type filter chips,
  tag filter chips (tag universe derived from an all-cards query), and a "show suspended"
  toggle. Filtered list uses `repo.search` via `useSearchCards`.
- Row actions: suspend/unsuspend (via `useSaveCard`, toggles `suspended`) and delete (via
  `useDeleteCard`, window.confirm — can swap for a nicer dialog later). Suspended cards show
  dimmed with a badge; excluded from the review queue.
- Counts ("X of N shown"), empty state, and no-match state.
- Build + lint + 33 tests pass. Next M4 (b): deck management + deck selector in editor.
