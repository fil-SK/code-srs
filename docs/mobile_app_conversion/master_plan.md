# Itera web + native convergence — Phase 0 architecture report

**Status: READ-ONLY analysis. `git status` is clean; nothing in the repository was modified.**
Verified against the working tree on branch `mvp_demo_cleaning` (2026-08-22), source of truth = the code, not the docs.

---

## Context

Itera is a stable web MVP (React 19 + Vite 8 + TS, 825 passing tests, clean `tsc -b --force`, clean lint). The strategic goal is a first-class React Native / Expo app at **feature parity**, kept in sync as the product evolves — not a reduced review client. The correctness work already invested (DST-safe calendar days, transactional review persistence, auth/backend-mode coherence, complete Supabase pagination, replace-import safety) must be **moved into shared ownership, not re-implemented for mobile**.

The decisive finding of this audit: **the repository is already structured for this.** `src/domain/` (4,686 LOC, 40 modules, 35 test files) imports nothing browser-specific — no `window`, no `document`, no `localStorage`, no `import.meta`. `src/hooks/` (441 LOC) has zero DOM references. The `Repository` seam already takes an injected client. There is exactly **one** `import.meta.env` site in the entire non-test codebase. This is a low-risk extraction, not a rewrite.

Decisions confirmed with the user before writing this plan:
1. **Extract `packages/core` first, then move web into `apps/web`, then scaffold Expo.** Classify each module before moving; do not dump browser-specific data/auth/hooks into core.
2. **Mobile is Supabase-authoritative for the first native app.** No second local database, no sync engine, until cross-device behaviour is proven. Mobile offline is a later explicit milestone.
3. **Native auth = 6-digit email OTP.** Web magic links unchanged. Deep linking is a later optional enhancement, never a prerequisite.

---

## 1. Executive recommendation

**Recommended architecture:** one npm-workspaces monorepo with a single source-TypeScript shared package.

```
packages/core   — types, domain, Repository contract, SupabaseRepository, TanStack hooks,
                  auth policy, RichText parser, chart projections, parity fixtures
packages/tokens — the Itera palette / radii / type scale as platform-neutral TS
apps/web        — the existing web app, moved verbatim, minus what core now owns
apps/mobile     — Expo Router + React Native, consuming the same core
```

**Is a restructure recommended?** Yes, but in two separately-gated moves, not one. Extract `packages/core` while the web app stays at the repo root and keeps passing every existing gate; only once web is green consuming core, `git mv` the web shell into `apps/web`; only then scaffold `apps/mobile`. The move is mechanical because every internal web import is already `@/…`-relative to `src/`.

**Broad difficulty:** medium overall, unevenly distributed.
- Shared extraction: **small-to-medium**, and almost entirely mechanical. Roughly 5,400 LOC moves; only ~6 files need a real refactor (listed in §5).
- Expo shell + auth + read-only surfaces (Today, Library, Progress): **medium**.
- Review with all six interactions: **medium-hard**, concentrated in Write Code and Matching.
- Authoring parity (six editors, code editing on a phone): **hard**, and the lowest-value-per-unit-effort work in the plan.

**Biggest risks, ranked:**
1. **React version coupling.** `packages/core` ships React code (hooks + `AuthProvider`). Expo pins a React version per SDK. Web must align to it, or the monorepo hoists two Reacts. This is the single constraint that can break the whole structure and must be settled at scaffold time (§17, §22 D1).
2. **`import.meta` is unsupported by Metro/Hermes.** Exactly one file uses it (`src/data/supabase/client.ts:5-6`). If env access ever leaks into core, the mobile build breaks in a way that is not obvious from the error. Must be permanently excluded by construction (§17).
3. **Silent behavioural divergence.** Ten contracts, if duplicated, change *what the learner is taught* without failing any test (§6). Retention eligibility, `stateBefore`, and DST-safe day boundaries are the top three.
4. **Write Code on a phone.** CodeMirror does not exist on native. There is no drop-in. This needs a deliberate product decision, not a library pick (§11.3, §22 D5).
5. **Matching at 390px** is already a known unresolved problem on web (`CURRENT_STATE.md` §14). Mobile forces the answer.

**Is full parity practical?** Yes, with one deliberate exception and one deferral.
- **Deliberate exception:** Roadmaps. `features.md` marks it explicitly out of scope, reskinned-only, deliberately outside the redesigned navigation. It should be recorded as **web-only by decision**, not "not yet ported".
- **Deferral:** offline mobile review. It is real product value and the `Repository` seam already makes it a drop-in, but it is a milestone of its own, after parity.
Everything else — all six interactions, authoring, Progress, import/export — is reachable. The hard parts are UI design problems, not architecture problems.

---

## 2. Current code-sharing map

Legend: **A** share unchanged · **B** share after extraction · **C** web only · **D** needs a native replacement.

### A — share unchanged (no code change; the file simply moves)

| Path | Why it qualifies |
|---|---|
| `src/types/*.ts` (304 LOC) | Pure type declarations plus one helper (`richText`). Zero imports outside `./`. |
| `src/domain/scheduling/{scheduler,reviewService,state,format}.ts` | Only deps: `ts-fsrs`, `@/types`, `@/lib/id`. `ts-fsrs` is pure arithmetic + `Date`. |
| `src/domain/grading/{matching,multipleChoice,ordering,writeCode}.ts` | Pure functions over interaction payloads. |
| `src/domain/stats/*` (10 modules) | `calendarDay`, `streak`, `learned`, `todayMetrics`, `deckMetrics`, `progressMetrics`, `dateRange`, `cardDeckIndex`, `reviewHistory`. All pure; `calendarDay.ts` uses only `Date` local getters/setters — Hermes-safe. |
| `src/domain/cards/*Form.ts` (6) | Pure form ⇄ record conversion + validators. |
| `src/domain/cards/factory.ts` | `createCard`. |
| `src/domain/search/searchableText.ts` | Pure; the `never` guard that enforces the interaction checklist. |
| `src/domain/io/{backup,validateBackupEntities,importFailure,backupFixtures}.ts` | Pure envelope + hand-written validators. |
| `src/domain/review/reviewPersistFailure.ts` | Pure copy, keyed on `WriteGuarantee`. |
| `src/domain/migration/runner.ts` | Contract only; nothing implements it. |
| `src/domain/decks/{tree,languages}.ts` | Pure tree helpers. |
| `src/data/repository.ts` | Interface + `CardQuery`/`DueQuery`/`WorkspaceSnapshot`/`WriteGuarantee`/`ReviewCommit`/`ReviewRevert`. No runtime code at all. |
| `src/lib/{id,shuffle}.ts` | `newId()` reads `globalThis.crypto` only. Needs a polyfill import on native, not a code change (§17). |
| `src/features/library/collectionTree.ts` | Despite living under `features/`, it imports only `@/types` and `domain/decks/tree`. Pure. **Belongs in core.** |
| `src/features/reviewV2/interactions/matching/matchingBadgeGeometry.ts` | Pure cubic-curve midpoint math, zero imports. |
| `src/features/reviewV2/reviewPhase.ts` | Pure reducer + `ObjectiveResult`. React-free. |
| `src/features/progress/components/retentionChartPath.ts` | Pure projection into chart coordinates. |
| `src/features/reviewV2/components/promptLength.ts` | Pure. |
| `src/features/today/greetings.ts`, `features/library/deckMark.ts`, `features/cards/shared/{format,editorSubtitle}.ts`, `features/library/shared/sortDecks.ts` | Pure string/sort helpers used by both platforms' UIs. |

### B — share after a small, named extraction

| Path | What blocks sharing | Target shape | Difficulty | Before or after Expo? |
|---|---|---|---|---|
| `src/hooks/*.ts` (6 files + `queryKeys.ts`) | `const repo = getRepository()` **at module scope**, which transitively imports `DexieRepository` (Dexie) and `supabase/client.ts` (`import.meta.env`). Nothing else — zero DOM. | `configureRepository(factory)` called once at app boot; `getRepository()` moves inside each `queryFn`/`mutationFn`. Hook signatures and call sites are unchanged. | **Small** (6 files, mechanical) | **Before** — this is the keystone extraction |
| `src/data/supabase/SupabaseRepository.ts` | Only its constructor default `= getSupabase()`, which reaches the `import.meta.env` module. Everything else (`selectAll` pagination, in-memory filters, the `commit_review` RPC) is platform-neutral and already takes an injected `SupabaseClient`. | Make the client argument **required**; export `createSupabaseRepository(client)`. Each app owns client construction. | **Trivial** (one line + call sites) | Before |
| `src/data/supabase/fakeSupabaseClient.ts` | None; it is a test double for a core module. | Moves with the repository so both apps' tests can use it. | Trivial | Before |
| `src/data/backup.ts` | Calls `getRepository()` internally. | `exportBackup(repo)`, `importBackup(repo, backup, mode)`, `canReplaceImport(repo)`. Its internal helper already takes `repo`. | **Trivial** | Before |
| `src/auth/AuthProvider.tsx` | Imports `isSupabaseConfigured`/`getSupabase` from the env module, and `localSession` (which touches `window.localStorage`). React itself is fine on RN. | Inject `{ supabaseConfigured, getClient, sessionStore }` as props/config. **Extract the mode-resolution rule into a pure `resolveAuthState()` first** — that is the P1-3 invariant and it must exist once. | **Small** | Before |
| `src/auth/localSession.ts` | `window.localStorage` / `window.sessionStorage` directly. | A `SessionStore` interface (`readRemembered/readSession/write/clear`). Web adapter = the current code verbatim; native adapter = SecureStore/AsyncStorage. Parse/validate/`DEMO_EMAIL` stay shared. | **Small** | Before |
| `src/components/text/RichText.tsx` | Tokenizer and JSX are interleaved (`splitBlocks` is already pure; `inline`/`emphasis` build `ReactNode` directly). | `parseRichContent(src): RichNode[]` in core (blocks → runs → `{kind:'text'|'code'|'strong'|'em'|'inlineCode'}`). Web `RichText.tsx` and a native `RichText.tsx` each render that tree. | **Small** | Before |
| `src/features/today/PaceChart.tsx` — `axisMaxFor`, `chartPoint` | Pure functions defined inline in a component file. | Move to `core/charts/paceGeometry.ts` beside `retentionChartPath.ts`. | Trivial | Can be incremental |
| `src/features/progress/components/ActivityHeatmap.tsx` — `toWeeks` | Same: pure, defined inline. | Move to `core/charts/heatmapGrid.ts`. | Trivial | Incremental |
| `src/features/cards/shared/interactionTypeMeta.ts`, `features/library/shared/rowVisuals.ts` | Carry Lucide component references and Tailwind class strings. | Split: **semantic** meta (label, icon *name*, token *name*) into core; the class strings and `lucide-react` imports stay per platform. | Small | Incremental |
| `src/domain/grading/walkthrough.ts` | **Inverted dependency**: `import type { ObjectiveResult } from '@/features/reviewV2/reviewPhase'` — domain reaching into features. | Move `ObjectiveResult` into core (it is `{correct: boolean; score?: number}`). Fixes a layering violation that exists today. | Trivial | Before |
| `src/features/reviewV2/interactions/types.ts` — the `InteractionDefinition` contract | Carries `View: ComponentType<...>`, which is platform-specific. | Split into a core `InteractionBehaviour` (`type`, `interactive`, `isResponseReady`, `autoGrade`) and a per-platform `View` binding. The six `index.ts` files' non-View halves then live in core. | **Small, high value** | Before Phase 7 |

### C — web only (stays in `apps/web`)

| Path | Why |
|---|---|
| `src/data/dexie/{db,DexieRepository}.ts` | Dexie/IndexedDB. Not available on RN. |
| `src/data/supabase/client.ts` | `import.meta.env` — a Metro/Hermes hard failure. |
| `src/app/router.tsx`, `RouteError.tsx` | `createBrowserRouter`. |
| `src/auth/RequireAuth.tsx` | `react-router-dom` `Navigate`/`Outlet`/`useLocation`. |
| `src/components/code/*` (6 files) | CodeMirror 6 — requires DOM. |
| `src/components/ui/{Button,Field,FloatingPanel,dialogs}.tsx` | Tailwind classes, portals, `document.activeElement`. |
| `src/components/layout/*` | `AppShell`, `TopNav`, `AccountMenu*`, `StreakBadge`, `useIsNarrowShell` (matchMedia). |
| `src/components/text/RichText.tsx` (the renderer) | JSX/DOM. The parser leaves; the renderer stays. |
| `src/lib/{cn,download,lazyWithRetry}.ts` | `tailwind-merge`; `document.createElement('a')` + `URL.createObjectURL`; `window.location.reload` + `sessionStorage`. |
| `src/index.css`, `vite.config.ts`, PWA/service-worker config, `index.html`, `public/` | Web platform. |
| All 68 files importing `react-router-dom`; all `src/features/**/*.tsx` | Web UI. |
| `src/features/roadmaps/*` | Web-only **by product decision**, not by technical limitation (`features.md` "Explicitly out of scope"). |
| `src/features/design-preview/*` | Dev-only fixture routes. A native equivalent is optional. |

### D — needs a native counterpart

| Web capability | Where it lives now | Native replacement | Decision needed in Phase 1? |
|---|---|---|---|
| Dexie / IndexedDB | `src/data/dexie/` | **None initially** (mobile is Supabase-authoritative). Later: `expo-sqlite` `Repository` implementation. | No — deferred by decision |
| `createBrowserRouter` | `src/app/router.tsx` | **Expo Router** (file-based, over React Navigation) | No |
| `RequireAuth` layout route | `src/auth/RequireAuth.tsx` | Expo Router route group `(app)` + a redirect guard reading the **shared** `resolveAuthState()` | No |
| CodeMirror read-only (`CodeView`) | `src/components/code/CodeView.tsx` | Shared Lezer tokenizer → `<Text>` spans, **or** an Expo DOM component (`'use dom'`) hosting the existing CodeView in a WebView | **Yes** — §22 D5 |
| CodeMirror editable (`CodeEditor`) | `src/components/code/CodeEditor.tsx` | `TextInput` multiline monospace + key-accessory bar, **or** the same DOM-component escape hatch | **Yes** — §22 D5 |
| dnd-kit sortable (Ordering) | `OrderingView/OrderingRow` | `react-native-gesture-handler` + `react-native-reanimated` (directly, or via `react-native-draggable-flatlist`) | Phase 7 |
| dnd-kit sortable (deck card reorder) | `LibraryDeckPage` | Same, or defer — reordering is a desktop authoring affordance | Phase 8 |
| Hand-rolled SVG charts | `PaceChart`, `RetentionChart`, `Sparkline`, `MatchingBoard` connectors | `react-native-svg` (Expo-supported). Projections already pure and shared. | Phase 9 (but decide once) |
| CSS heat-map grid | `ActivityHeatmap` | Plain `<View>` grid — no SVG needed | No |
| `offsetLeft`/`offsetTop` measurement | `MatchingBoard.tsx` | `onLayout` (`nativeEvent.layout.{x,y,width,height}`) — a cleaner analogue than offsetParent chains | Phase 7 |
| `document.createElement('a')` download | `src/lib/download.ts` | `expo-file-system` write + `expo-sharing` share sheet | Phase 10 |
| `<input type="file">` import | `ImportExportSection.tsx` | `expo-document-picker` + `expo-file-system` read | Phase 10 |
| `localStorage` session | `src/auth/localSession.ts` | `expo-secure-store` (with the 2KB-per-value caveat) or `@react-native-async-storage/async-storage` | Phase 3 |
| PWA / service worker / `autoUpdate` | `vite.config.ts` | Expo Updates (OTA) — **different mechanism, same intent** | Phase 12 |
| `window.addEventListener('keydown')` review shortcuts | `ReviewSessionScreen.tsx` | No native equivalent; tap/gesture affordances replace them | Phase 7 |
| `crypto.randomUUID` / `getRandomValues` | `src/lib/id.ts` | `react-native-get-random-values` polyfill imported at app entry — **no code change to `newId()`** | Phase 3 |
| `Intl.DateTimeFormat` | `dateRange.ts`, `todayMetrics.ts`, chart components | Hermes Intl. Available on modern RN, but **verify** `weekday: 'narrow'` and `month: 'short'` output on both platforms in Phase 3 | Verify, not decide |
| Focus management / `manageFocus` | `FloatingPanel`, `dialogs` | Native accessibility focus + modal presentation; not a port | Phase 10 |

---

## 3. Dependency compatibility

| Dependency | Current use | Verdict | Mobile implication |
|---|---|---|---|
| `react` 19.2 | Everything | **Shareable** | Must be a **single hoisted copy** at the version Expo's SDK pins. This is the #1 structural constraint (§22 D1). |
| `react-dom` 19.2 | Web render | Web only | Never enters core. |
| `@tanstack/react-query` 5.101 | All data access, `src/hooks/` | **RN-compatible** | Works unmodified on RN. Mobile should add `onlineManager`/`focusManager` bindings for `AppState` + NetInfo. Same `qk` keys, same hooks. |
| `@supabase/supabase-js` 2.108 | `SupabaseRepository`, auth | **RN-compatible** | Needs a native config: `storage: <adapter>`, `detectSessionInUrl: false`, `persistSession: true`, plus `AppState` → `startAutoRefresh()`/`stopAutoRefresh()`. May need a `URL`/`structuredClone` polyfill depending on RN version — verify at scaffold. |
| `ts-fsrs` 5.4 | `scheduler.ts` | **Shareable, pure** | Pure arithmetic over `Date`. No environment assumptions. **This must never be duplicated** (§6). |
| `dexie` 4.4 | `DexieRepository` | **Web only** | Not portable. Native offline uses `expo-sqlite` later, behind the same `Repository`. |
| `react-router-dom` 7.18 | 68 files | **Web only** | Expo Router. |
| `@dnd-kit/{core,sortable,utilities}` | Ordering review + deck reorder (3 files) | **Web only** | Reanimated + Gesture Handler. |
| `@codemirror/*` (9 packages) | `CodeView`/`CodeEditor` | **Web only** | See §13. Note: the underlying `@lezer/*` parsers are **pure JS with no DOM dependency** and are a viable shared tokenizer. |
| `lucide-react` 1.21 | 62 files | **Web only** (the React-DOM build) | `lucide-react-native` exists with the same icon names — share **icon names as semantic tokens**, not components. |
| `tailwindcss` 4.3 + `@tailwindcss/vite` + `tailwind-merge` + `clsx` | Styling, `cn()` | **Web only** | Do not attempt to share CSS. Share the **token values** (§14). NativeWind is a possibility but is an extra dependency and an extra failure mode — not recommended for the first client. |
| SVG charts | Hand-rolled JSX (`PaceChart`, `RetentionChart`, `Sparkline`, `RoadmapCanvas`, `MatchingBoard`) | **Geometry shareable; rendering web-only** | `react-native-svg`. This is the **one new rendering dependency the plan endorses**, and it is Expo-first-party-supported. |
| Markdown / `RichText.tsx` | Hand-built XSS-safe subset | **Parser shareable; renderer web-only** | The no-markdown-dependency rule holds on both platforms. |
| `@fontsource-variable/{inter,jetbrains-mono}` | Self-hosted webfonts | **Web only** | `expo-font` + the same TTF/OTF families. |
| `vite`, `vite-plugin-pwa`, `@vitejs/plugin-react` | Build/PWA | **Web only** | Metro + `babel-preset-expo`; Expo Updates for OTA. |
| `vitest` 4.1, `happy-dom`, `fake-indexeddb`, `@testing-library/react`, `playwright` | Tests | **Vitest shareable for core**; the rest web only | Mobile uses `jest-expo` + `@testing-library/react-native`. Core is tested **once**, by Vitest (§16). |
| `oxlint` 1.69 | Lint | Shareable | One config at the workspace root. |
| `typescript` ~6.0 | Typecheck | Shareable | One version, hoisted. |

**Accidental leaks into otherwise-shareable modules — the complete list:**

1. `src/data/supabase/client.ts:5-6` — **`import.meta.env`**. The only occurrence in the entire non-test codebase, and a hard Metro/Hermes failure. It is reached from `src/data/index.ts` → every hook. **This is the single most important thing to keep out of `packages/core`.**
2. `src/data/index.ts` — imports `DexieRepository` (Dexie) and the env module, then every hook imports it at module scope. One import chain makes six otherwise-perfect shared files unshareable.
3. `src/domain/grading/walkthrough.ts:2` — `import type { ObjectiveResult } from '@/features/reviewV2/reviewPhase'`. Type-only, so zero runtime cost, but it is domain → features, the wrong direction, and it would drag a `features/` path into core.
4. `src/domain/{cards,scheduling}/*` → `@/lib/id` → `crypto`. Not a bundler leak; a **runtime polyfill requirement** on native.
5. `src/features/library/collectionTree.ts` and `matchingBadgeGeometry.ts` are pure but live under `features/`, so a naive "share `src/domain` only" extraction would miss them and invite a native re-implementation of the Collection tree — a real divergence risk.

---

## 4. Recommended repository structure

```
itera/
├── package.json                  # workspace root: workspaces, shared devDeps, scripts
├── tsconfig.base.json            # strict flags + paths: @itera/core, @itera/tokens
├── .oxlintrc.json
├── docs/                         # unchanged, workspace-level
├── supabase/                     # unchanged, workspace-level (schema.sql, migrations/)
│
├── packages/
│   ├── core/
│   │   ├── package.json          # "main": "src/index.ts"  <- SOURCE, no build step
│   │   ├── vitest.config.ts      # environment: 'node'
│   │   └── src/
│   │       ├── types/            # card, deck, review, draft, roadmap, common
│   │       ├── domain/           # scheduling, grading, stats, cards, decks, io,
│   │       │                     #   search, migration, review  (all 40 modules)
│   │       ├── data/
│   │       │   ├── repository.ts         # the interface + query/guarantee types
│   │       │   ├── registry.ts           # configureRepository / getRepository
│   │       │   ├── backup.ts             # exportBackup(repo) / importBackup(repo,..)
│   │       │   └── supabase/             # SupabaseRepository(client), fakeSupabaseClient
│   │       ├── hooks/            # useCards, useDecks, useReview, useDrafts,
│   │       │                     #   useRoadmaps, useBackup, queryKeys
│   │       ├── auth/             # resolveAuthState (pure), SessionStore contract,
│   │       │                     #   localSession parse/create, AuthProvider (injected)
│   │       ├── text/             # parseRichContent -> RichNode[]
│   │       ├── interactions/     # the six InteractionBehaviour objects (no View)
│   │       ├── charts/           # retentionChartPath, paceGeometry, heatmapGrid
│   │       ├── library/          # collectionTree, sortDecks, deckMark
│   │       ├── fixtures/         # backupFixtures + parityWorkspace + expectations
│   │       └── index.ts
│   │
│   └── tokens/
│       ├── package.json
│       └── src/index.ts          # itera palette, radii, type scale, icon names
│
└── apps/
    ├── web/                      # the current app, moved verbatim
    │   ├── package.json          # vite, react-dom, dexie, codemirror, dnd-kit,
    │   │                         #   tailwind, react-router-dom, lucide-react
    │   ├── index.html
    │   ├── vite.config.ts        # PWA config, '@' -> ./src
    │   ├── vitest.config.ts      # happy-dom opt-in, VITE_SUPABASE_* blanked
    │   ├── public/
    │   └── src/
    │       ├── app/  auth/  components/  features/
    │       ├── data/dexie/       # web-only backend
    │       ├── data/supabase/client.ts   # import.meta.env lives HERE, only here
    │       ├── lib/              # cn, download, lazyWithRetry
    │       └── index.css         # asserts against @itera/tokens in a test
    │
    └── mobile/
        ├── package.json          # expo, expo-router, react-native, react-native-svg,
        │                         #   reanimated, gesture-handler, secure-store, ...
        ├── app.json
        ├── metro.config.js       # getDefaultConfig(__dirname) + monorepo watchFolders
        ├── babel.config.js
        ├── jest.config.js        # jest-expo preset
        ├── app/                  # Expo Router file tree (see §9)
        └── src/
            ├── data/             # supabaseClient.ts (EXPO_PUBLIC_*, storage adapter)
            ├── auth/             # SecureStore SessionStore adapter, guard
            ├── components/       # Text, Card, RichText, CodeText, Button, ...
            ├── interactions/     # six native Views bound to core behaviours
            └── theme/            # StyleSheet built from @itera/tokens
```

**Why this shape, and not the alternatives:**

| Criterion | **A: apps/packages monorepo (recommended)** | B: web at root + `mobile/` + `shared/` | C: separate repos, published package |
|---|---|---|---|
| Migration complexity | Two gated steps: extract, then move | One step (no move) | Extract + publish + version |
| Import ergonomics | `@itera/core` everywhere, symmetric | Asymmetric: web uses `@/…`, mobile uses `../../shared` | `@itera/core@x.y.z` — needs a release for every change |
| Metro compatibility | Standard Expo monorepo setup (`watchFolders`, `nodeModulesPaths`) | Metro must escape `mobile/` upward into a root `node_modules` shared with Vite | Cleanest for Metro, worst for iteration |
| Vite compatibility | `apps/web` is an ordinary Vite root; workspace symlinks resolve | Fine | Fine |
| TS config complexity | One `tsconfig.base.json`, two extending configs, `paths` for editors | Root tsconfig serves two very different targets (DOM vs RN libs) | Needs emitted `.d.ts` per release |
| **Risk to current web build** | Contained: extraction is gated before the move; the move is `git mv` + path edits | Lowest churn, but the root `package.json` is *both* the web app and the workspace root — one hoisted `react`/`react-dom`/`dexie` tree that Metro also walks | Lowest, but the shared code stops being editable in place |
| Long-term maintainability | Symmetric; adding a third target is additive | Structurally implies "web is the real app, mobile is a satellite" — the exact drift the goal forbids | Version skew between apps is now possible, which defeats "one engine" |

Option **B**'s fatal flaw is the React-hoisting hazard the user's answer already anticipates: the root `package.json` would carry both Vite's React and React Native's React requirements, and Metro would happily resolve `react-dom` or `dexie` from a mobile import. Option **C** reintroduces version skew, which is exactly the divergence this whole exercise exists to prevent. **A** it is.

---

## 5. Migration strategy

Every step below is one commit, with the same gate: **`npx vitest run` (825+, no reduction), `npx tsc -b --force`, `npm run lint`, `npm run build`, plus a Chromium smoke pass at 1440×900 and 390×844.** Rollback is `git revert` of that single commit; no step depends on a later one having landed.

The invariant across all of Phase 1: **`apps/web`'s behaviour does not change.** No route, no component, no query key, no persisted shape. If the test count moves for any reason other than tests physically relocating between packages, the step is wrong.

### Step 1.0 — Workspace scaffolding *(no code moves)*
- **Change:** add `"workspaces": ["packages/*"]` to the root `package.json`; create `packages/core` with `"main": "src/index.ts"` and an empty `src/index.ts`; add `tsconfig.base.json` with a `@itera/core` path mapping; add a `vitest.config.ts` in core.
- **Risk:** low. npm may re-hoist `node_modules`.
- **Gate:** all four commands clean, unchanged test count.
- **Checkpoint:** the web app still builds and runs with a workspace present but unused.

### Step 1.1 — `types` → core
- **Change:** move `src/types/*`. Web re-exports from `@itera/core` under `@/types` so **no web import changes** (a one-file shim). This is the trick that keeps every subsequent step small.
- **Risk:** low. Proves TS path resolution, Vite resolution and Vitest resolution across a workspace boundary in one shot.
- **Gate:** as above. **This step is the real proof that the structure works.** If `tsc -b --force` cannot resolve source TS across the boundary, stop and fix the config here, not later.

### Step 1.2 — `domain` → core, plus the two layering fixes
- **Change:** move all 40 `src/domain/` modules and their 35 test files. Move `ObjectiveResult` from `features/reviewV2/reviewPhase.ts` into core and re-point `grading/walkthrough.ts` (fixes the domain→features inversion). Move `src/lib/{id,shuffle}.ts`. Move `collectionTree.ts`, `matchingBadgeGeometry.ts`, `retentionChartPath.ts`, `promptLength.ts`, `greetings.ts`, `deckMark.ts`, `sortDecks.ts`. Keep `@/domain/*` shims in web.
- **Risk:** low-medium — the largest single move (~4,700 LOC), but purely mechanical.
- **Gate:** 35 domain test files now run under `packages/core`; web's count drops by exactly that many and core's rises by the same. **Sum must be unchanged.**

### Step 1.3 — `Repository` contract + `SupabaseRepository` → core
- **Change:** move `src/data/repository.ts`. Move `SupabaseRepository.ts` + `fakeSupabaseClient.ts`, making the client constructor argument **required**. `src/data/supabase/client.ts` stays in web and is now the only caller passing one. Move `src/data/backup.ts` to take `repo` as a parameter.
- **Risk:** low. The `import.meta.env` boundary is drawn here and never crossed again.
- **Gate:** the 24-case pagination suite, `backendParity.test.ts` and `backupCompleteness.test.ts` all move to core and pass there. Dexie stays in web; `backendParity` needs `DexieRepository` — either keep that one file in web, or (better) have core export the parity fixture and let each backend's parity test live beside its backend.

### Step 1.4 — repository registration + `hooks` → core ← **the keystone**
- **Change:** replace `src/data/index.ts`'s module-scope singleton with `packages/core/src/data/registry.ts`:
  ```ts
  let factory: (() => Repository) | null = null
  let instance: Repository | null = null
  export function configureRepository(f: () => Repository) { factory = f; instance = null }
  export function getRepository(): Repository {
    if (!factory) throw new Error('configureRepository() was never called')
    return (instance ??= factory())
  }
  ```
  Move all 7 hook files; inside each, change `const repo = getRepository()` at module scope to a call **inside** each `queryFn`/`mutationFn`. Web's entry (`src/main.tsx`) calls `configureRepository(() => isSupabaseConfigured ? new SupabaseRepository(getSupabase()) : new DexieRepository())`. `src/test/setup.ts` configures Dexie.
- **Why registration rather than a React context:** it preserves the existing hook call shape exactly, requires no provider in any test render tree, and keeps the "never import a backend from a component/hook/page" invariant literally true. A context is the more idiomatic answer but changes ~40 call-site render trees for no behavioural gain.
- **Risk:** **medium — the highest-risk step in the plan.** A missed `configureRepository()` call surfaces as a runtime throw, not a type error. Mitigate with an explicit "throws when unconfigured" test and a check that every entry point (web `main.tsx`, web test setup, later mobile `_layout.tsx`, mobile jest setup) configures exactly once.
- **Gate:** all four commands, **plus** a manual browser pass of create-card → review → grade → Progress, because this step touches the write path.

### Step 1.5 — auth policy → core
- **Change:** extract `resolveAuthState({ supabaseConfigured, supabaseSession, localSession })` → `{ identity, isAuthenticated }` as a **pure function**, and unit-test it against every case the P1-3 fix established (stale local record in Supabase mode, demo identity, bootstrap failure, sign-out). Define `SessionStore`; keep the current `window.localStorage`/`sessionStorage` implementation in web as `WebSessionStore`. Make `AuthProvider` take `{ supabaseConfigured, getClient, sessionStore }`.
- **Risk:** medium — this is the code the audit's P1-3 finding lives in. The existing 7 Supabase-mode tests in `RequireAuth.test.tsx` are the regression net; they must keep passing unchanged.
- **Gate:** all four commands + the `RequireAuth.test.tsx` Supabase-mode block green with no edits to its assertions.

### Step 1.6 — `packages/tokens` + the RichText parser
- **Change:** create `packages/tokens` from the `--itera-*` block in `src/index.css` (lines ~139-190). Add a **drift test** in `apps/web` that reads `index.css` and asserts every `--itera-*` value equals the TS module — no build step, no generated CSS. Extract `parseRichContent` into core; `RichText.tsx`/`InlineText` render the returned node tree.
- **Risk:** low. The parser has no test file today — **write tests for it during extraction** (fences, inline code precedence over emphasis, underscores staying literal, the XSS-safety property).
- **Gate:** as above, plus a visual check of a card with fenced code, inline code, bold and `snake_case`.

### Step 1.7 — interaction behaviour split
- **Change:** split `InteractionDefinition` into a core `InteractionBehaviour<T>` (`type`, `interactive`, `isResponseReady`, `autoGrade`, `widthFor`) and a per-platform `{ ...behaviour, View }` binding. Move the six behaviour objects into core; the six `View`s stay in web.
- **Risk:** low. The registry's deliberate `Partial<Record<…>>` runtime-throw semantics must survive **on both platforms** — a seventh interaction must still fail loudly.
- **Gate:** all four commands + `/design-preview/review/*` all six render.

### Step 2 — move web into `apps/web`
- **Change:** `git mv src public index.html vite.config.ts vitest.config.ts tsconfig.app.json … apps/web/`. Split the root `package.json` into a workspace root (shared devDeps, scripts) and `apps/web/package.json` (vite, react-dom, dexie, codemirror, dnd-kit, tailwind, router, lucide). Update `vite.config.ts`'s `path.resolve(__dirname, './src')` and `vitest.config.ts` identically. Update `docs/` paths in the same pass.
- **Why after Phase 1:** by now web imports `@itera/core` through a real workspace resolution, so the move cannot also be hiding a resolution bug.
- **Risk:** medium-mechanical. The failure modes are all path-shaped and all caught by `npm run build`.
- **Gate:** all four commands from `apps/web`, plus `npm run preview` and a full browser pass of every route in `CURRENT_STATE.md` §18.
- **Checkpoint:** tag this commit. It is the last point before any native code exists.

### Step 3 — scaffold `apps/mobile`
See §19 Phase 3. Nothing in `packages/core` or `apps/web` changes.

**Explicitly rejected:** moving the web app into `apps/web` first and extracting afterwards. That front-loads the largest diff into the step with the least information, and if `tsc -b --force` or Vitest resolution breaks you cannot tell whether the cause is the move or the extraction.

---

## 6. Shared-domain boundary — what must exist exactly once

| Contract | Where | Verdict | Risk if duplicated |
|---|---|---|---|
| **Card schema** (`Card`, `CardInteraction`, `RichContent`, `CARD_SCHEMA_VERSION`) | `core/types/card.ts` | **share unchanged** | **HIGH** — two schemas means two backup formats and unreadable cross-device rows |
| **Interaction type union + registry semantics** | `core/types/card.ts`, `core/interactions/` | **share unchanged / share after extraction** | **HIGH** — a type authored on one platform silently unrenderable on the other |
| **`SchedulingState`** | `core/types/review.ts` | share unchanged | **HIGH** |
| **FSRS integration** (`scheduler.ts`: `toCardInput`/`fromCard`/`reviewState`/`previewStates`) | `core/domain/scheduling/` | share unchanged | **HIGHEST** — a second adapter with different field mapping or default params gives the *same card different intervals on different devices*. Undetectable without cross-device testing. |
| **`buildReviewLog`** — the `stateBefore` choke point | `core/domain/scheduling/scheduler.ts` | share unchanged | **HIGHEST** — a native log missing `stateBefore` contaminates mature retention forever and is rejected by backup validation. This is Milestone 3's entire correctness result. |
| **`reviewService.submit`** — computes, never persists; result is immutable so retry is safe | `core/domain/scheduling/reviewService.ts` | share unchanged | **HIGHEST** — a native path that recomputes on retry double-grades. Exactly the P2-B bug. |
| **`commitReview`/`revertReview` + `WriteGuarantee`** | `core/data/repository.ts` | share unchanged | **HIGHEST** — a native `cards.put()` + `reviews.append()` re-opens audit §10 item 6 |
| **Objective grading** (`matching`, `multipleChoice`, `ordering`, `writeCode`, `walkthrough`) | `core/domain/grading/` | share unchanged | **HIGH** — the same answer marked correct on one device and wrong on the other |
| **`computeRetention`** — eligible iff `stateBefore ∈ {review, relearning}`, successful iff `rating ≥ 2` | `core/domain/stats/progressMetrics.ts` | share unchanged | **HIGH** — the most subtle rule in the product and the easiest to re-derive wrongly |
| **`computeStreak`** + `formatDayCount` | `core/domain/stats/streak.ts` | share unchanged | **HIGH** — grace behaviour and pluralization are non-obvious |
| **`computeLearned`** | `core/domain/stats/learned.ts` | share unchanged | HIGH |
| **`calendarDay.ts`** — the DST-safe local-day definition | `core/domain/stats/calendarDay.ts` | share unchanged | **HIGHEST** — audit P1-2 verbatim. A native `+ 86_400_000` breaks streaks, pace, heat map and "Yesterday", and only in DST-observing timezones twice a year. |
| **Progress series** (`progressMetrics`, `todayMetrics`, `deckMetrics`, `dateRange`, `cardDeckIndex`, `reviewHistory`) | `core/domain/stats/` | share unchanged | HIGH |
| **`getDue` semantics** — suspended filtered in memory, `limit` applied *after* deck/tag filters | `core/data/repository.ts` contract + both backends | share unchanged (contract) | **HIGH** — a native server-side `.limit()` discards candidates the filters never saw (audit P1-4's sibling) |
| **Search/filter semantics** (`searchableText`, in-memory text/tag/type filtering) | `core/domain/search/` | share unchanged | MEDIUM-HIGH — divergent results between platforms for the same query |
| **Supabase pagination** (`selectAll`, never terminate on a short page, deterministic order ending in `id`) | `core/data/supabase/SupabaseRepository.ts` | share unchanged | **HIGHEST** — a native client issuing bare `select()` re-creates P1-4 with no error |
| **Backup schema + validation** (`BACKUP_VERSION`, `BACKUP_APP_MARKER`, `validateBackupEntities`, the `card.deckId` referential rule) | `core/domain/io/`, `core/data/backup.ts` | share unchanged | **HIGH** — a file exported on one platform rejected by the other |
| **Collection derivation** (`collectionTree` over `Deck.parentId`) | `core/library/` | share unchanged | MEDIUM-HIGH — two different Library trees for the same data |
| **Repository interface** | `core/data/repository.ts` | share unchanged | **HIGHEST** — the whole seam |
| **Query keys (`qk`)** | `core/hooks/queryKeys.ts` | share unchanged | MEDIUM — divergent invalidation |
| **Auth mode resolution** (`resolveAuthState`) | `core/auth/` | **share after extraction** | **HIGHEST** — audit P1-3 verbatim. A native "is a stale session a session?" answer is exactly the bug that shipped. |
| **Domain errors** (`ImportFailure`, `describeImportFailure`, `describeReviewCommitFailure`) | `core/domain/io/`, `core/domain/review/` | share unchanged | MEDIUM — copy that over-promises what a backend guaranteed |
| **RichContent parse semantics** | `core/text/` | **share after extraction** | MEDIUM-HIGH — `snake_case` becoming italics on one platform |
| **Chart projections** (`retentionChartPath`, pace geometry, heatmap weeks) | `core/charts/` | share after extraction | LOW-MEDIUM — cosmetic, but two charts of the same data disagreeing is a credibility bug |
| **Design tokens** | `packages/tokens` | share after extraction | LOW-MEDIUM |
| **Dexie backend** | `apps/web` | **platform-specific** | — |
| **`import.meta.env` config access** | `apps/web` | **platform-specific** | — |
| **Session storage (`localStorage` vs SecureStore)** | per app, behind `SessionStore` | **platform-specific** | — |
| **Routing, navigation guard, all UI** | per app | **platform-specific** | — |

**High-risk duplication boundaries** (flagged as required): FSRS integration, `buildReviewLog`, `reviewService.submit` immutability, `commitReview` atomicity, `calendarDay`, `computeRetention`, `computeStreak`, `getDue` semantics, `selectAll` pagination, `resolveAuthState`, and all five graders. **Every one of these already exists as a pure, tested module today.** The extraction is the whole mitigation.

---

## 7. Repository / data / sync architecture

### Answers to the eight seam questions

1. **Can mobile use the same `Repository` interface?** Yes, unchanged. It is a plain async CRUD contract with no browser types, no cursors, no pagination, no `File`/`Blob`. `WorkspaceSnapshot`, `ReviewCommit`, `ReviewRevert` and `WriteGuarantee` are all plain data.
2. **Can `SupabaseRepository` be shared unchanged?** Yes, apart from one line. Its constructor already accepts an injected `SupabaseClient` (`constructor(sb: SupabaseClient = getSupabase())`); making that argument required removes the only coupling. The pagination loop, in-memory filters, and the `commit_review`/`revert_review` RPCs are all platform-neutral.
3. **What web assumptions exist inside it?** Exactly one: the default-argument call to `getSupabase()`. Nothing else — no `window`, no `fetch` customization, no storage assumption.
4. **Does it depend on Vite env access?** Only transitively, through that default argument. `import.meta.env` lives solely in `src/data/supabase/client.ts`.
5. **Should configuration/client construction move behind platform adapters?** Yes, and it is the cleanest boundary in the whole plan. Core owns the repository *implementation*; each app owns *client construction* (env source, auth storage, `detectSessionInUrl`, `AppState` refresh) and calls `configureRepository()` once at boot.
6. **What would a mobile-local repository look like?** `ExpoSqliteRepository implements Repository`, one table per entity with an `id TEXT PRIMARY KEY` and a `data TEXT` JSON column — mirroring the Supabase `data jsonb` model exactly. Generated/extracted columns for `due`, `suspended`, `deck_id`, `card_id`, `reviewed_at` for indexing; all text/tag/type filtering in memory, identically to both existing backends. `expo-sqlite`'s `withExclusiveTransactionAsync` supports both `importGuarantee: 'transactional'` and `reviewGuarantee: 'transactional'` — so mobile-local would actually be *stronger* than Supabase, which has to refuse replace-import.
7. **Is a mobile-local repository necessary initially?** **No** — and per the user's decision, it is deliberately deferred. Adding a second local store on day one means writing a sync engine before the architecture has been proven end to end. Supabase-authoritative mobile makes cross-device correctness trivially true because both clients read and write the *same rows*.
8. **How should offline eventually work?** See "Later evolution" below.

### Model comparison

| | **Model A — Supabase authoritative** | Model B — local store per device + sync | Model C — hybrid |
|---|---|---|---|
| Shape | Each client reads/writes Supabase directly | Each device owns a local DB; a sync layer reconciles | Local cache + write-through queue; Supabase is the record |
| Offline review | None on mobile | Full | Full, with a bounded queue |
| Conflict handling | **None needed** — one authoritative copy | Required for cards, decks, scheduling; ReviewLogs are append-only so they merge cleanly | Required, but narrower |
| Simultaneous editing | Last write wins at row granularity, same as web today | Needs per-entity rules | Needs per-entity rules |
| ReviewLog semantics | Insert with a client-minted id; `on conflict (id) do nothing` already makes it idempotent | Append-only union — the easy half | Same |
| Scheduling conflicts | Impossible: one row | Real. Two devices grading the same card produce two valid-but-different `SchedulingState`s | Real |
| Transactions/RPC impact | `commit_review` already gives per-grade atomicity; replace-import stays refused | Local transactions are easy; the *sync* is not transactional | The queue must preserve commit boundaries |
| Effort | **~0 beyond wiring** | Large | Large |

**Recommendation — initial implementation: Model A.**

- **Web:** unchanged. Dexie by default, Supabase when `VITE_SUPABASE_*` is set. Not touched by this work.
- **Mobile:** `SupabaseRepository` only. `configureRepository(() => new SupabaseRepository(nativeClient))` at boot. If the user is not signed in, there is no repository — which is already true structurally, since `RequireAuth`'s native equivalent gates every product route.
- **Cross-device:** works by construction. Desktop (in cloud mode) creates a deck and a card → the rows exist → mobile's `useSearchCards`/`useDueCards` read them. Mobile grades → `commit_review` writes card + log in one transaction → desktop's `qk.cards`/`qk.reviewsAll` invalidation on next fetch shows the new scheduling, the new history row, the moved streak and the updated retention.
- **Freshness:** TanStack Query's existing invalidation covers same-device staleness. For cross-device, bind `focusManager` to `AppState` and `onlineManager` to NetInfo on mobile, and consider `refetchOnWindowFocus` on web. **No realtime subscription in the first version** — it is a nice-to-have that adds a second consistency model.
- **What this makes explicit and must be said in the product:** a mobile user with no connection cannot review. That is an honest, temporary limitation, and it is preferable to a sync engine written before anyone has used the app on two devices.

**Conflict model for Model A (state it, even though it is trivial):** row-level last-write-wins on `cards`/`decks`, which is exactly what `crud.put()`'s `upsert` already does on web today. `review_logs` are append-only and id-idempotent. There is no new semantics to invent.

### Later offline/sync evolution (a milestone, not this plan)

When offline review is taken up, the smallest safe design — and the one the current architecture is already shaped for:

1. **`ExpoSqliteRepository`** implementing the same interface, mirroring the Supabase JSON-blob model. Nothing above the seam changes.
2. **A `SyncingRepository` decorator**, not a rewrite: reads hit local, writes hit local *and* enqueue an outbound operation. It implements `Repository`, so `configureRepository()` is the only wiring point.
3. **Asymmetric reconciliation, exploiting the domain's existing shape:**
   - `review_logs` — pure append-only union, keyed by the client-minted id. `on conflict (id) do nothing` is already in `0004_review_commit_rpc.sql`. **Zero conflicts by construction.** This is the half that matters, because every statistic derives from the logs.
   - `cards.scheduling` — genuinely conflicting only if the same card is graded on two devices while one is offline. Resolve by **replaying**: take the union of ReviewLogs for that card, sort by `reviewedAt`, and recompute `SchedulingState` from the earliest `stateBefore` using the shared `reviewState()`. This works *because* `stateBefore` is required (Milestone 3) and because FSRS is deterministic — the correctness work already done is what makes the eventual sync tractable.
   - `cards` content / `decks` — last-write-wins on `updatedAt`, with the loser exportable. Deletions need tombstones, which is the one genuine schema addition (a `deleted_at` column or a `tombstones` table, with its own migration under `MigrationRunner`).
4. **No CRDT.** The only field with real merge semantics is an append-only log, and scheduling is a deterministic function of it. A CRDT would be strictly more machinery for strictly less determinism.
5. **Cloud replace-import** (`TODO.md`, D242) is a separate, orthogonal item and should not be folded in.

---

## 8. Authentication architecture

### What is shared

| Piece | Verdict |
|---|---|
| **`resolveAuthState({ supabaseConfigured, supabaseSession, localSession })` → `{ identity, isAuthenticated }`** | **Shared, pure, extracted in Step 1.5.** This is the P1-3 invariant: *authentication mode follows repository mode*. It must be one function, tested once. |
| `AuthIdentity`, `LocalSession`, `LocalSessionKind`, `DEMO_EMAIL` | Shared types/constants |
| `LocalSession` parse/validate/create (corrupt value ⇒ signed out) | Shared |
| `AuthProvider`'s bootstrap **behaviour** — `.then/.catch/.finally` with a `cancelled` flag so `loading` always clears; `sessionError` as one plain sentence; clear the local record once during the Supabase bootstrap; never invent a session on failure | **Shared** (React, no DOM), with `{ supabaseConfigured, getClient, sessionStore }` injected |
| `BOOTSTRAP_ERROR` copy | Shared |
| `onAuthStateChange` subscription + cleanup | Shared |

### What is platform-specific

| Concern | Web | Native |
|---|---|---|
| Config source | `import.meta.env.VITE_SUPABASE_*` | `process.env.EXPO_PUBLIC_SUPABASE_*` (inlined by `babel-preset-expo`) |
| Client options | `persistSession`, `autoRefreshToken`, **`detectSessionInUrl: true`** | `persistSession`, `autoRefreshToken`, **`detectSessionInUrl: false`** (no URL bar), plus an explicit `storage` adapter |
| Session storage | `localStorage` / `sessionStorage`, one key `itera.session` | `expo-secure-store`, or AsyncStorage — see the caveat below |
| Token refresh | Handled by supabase-js in a live tab | **Must be driven by `AppState`**: `startAutoRefresh()` on `active`, `stopAutoRefresh()` on `background`. Without this, a session that expired while backgrounded surfaces as 401s on resume, not as a sign-out. |
| App resume/background | n/a | `AppState` also drives TanStack `focusManager`, so returning to the app refetches Today/due rather than showing stale counts |
| Sign-in method | Magic link (`signInWithOtp`), unchanged | **6-digit email OTP**: `signInWithOtp({ email })` then `verifyOtp({ email, token, type: 'email' })` |
| Route guard | `RequireAuth` pathless layout route + `<Navigate state={{from}}>` | Expo Router `(app)` group layout redirecting to `/(auth)/sign-in`, preserving the intended href |
| Sign-out | `clearLocalSession()` + `supabase.auth.signOut()` | Same shape; clears SecureStore + `supabase.auth.signOut()` |
| Local/demo mode | Real: gates the app with no backend | **Not applicable.** Mobile is Supabase-authoritative, so `supabaseConfigured` is always true and `resolveAuthState` returns "only a Supabase session counts". `signInLocal`/`signInDemo` are already no-ops in that mode — mobile simply never renders them. |

**Why 6-digit OTP and not the magic link:** it uses the *same* `signInWithOtp` call the web already makes, needs no URL scheme in `app.json`, no Supabase redirect allow-list entry, no PKCE `exchangeCodeForSession`, no `apple-app-site-association` / `assetlinks.json`, and behaves identically in Expo Go, a dev client, TestFlight and production. It removes an entire class of "the link opened Safari instead of the app" failures from the first native milestone. Deep linking can be added later as an enhancement to the sign-in screen only.

**How the P1-3 bug is prevented from recurring on native — three structural guarantees:**
1. `resolveAuthState` is **one shared pure function**. Native cannot answer "is this a session?" differently, because native does not implement that answer.
2. Native has no local-session concept at all. `SessionStore` on native holds only the Supabase session; there is no `itera.session`-shaped record for a stale one to come from.
3. The guard reads `isAuthenticated` from the shared provider. **Nothing on mobile may read SecureStore/AsyncStorage for an auth decision** — the same rule `localSession.ts` states for web, restated per platform and enforced by the `SessionStore` boundary.

**The one native storage caveat that needs a decision:** `expo-secure-store` warns above ~2048 bytes per value, and a Supabase session (access + refresh JWT + user object) can exceed that. Options: (a) AsyncStorage — simple, but the refresh token sits in plain app-sandbox storage; (b) SecureStore with a chunking adapter — secure, slightly more code; (c) refresh token in SecureStore, the rest in AsyncStorage. **Recommend (b)**, decided in Phase 3 (§22 D4).

---

## 9. Navigation architecture

Current web routes → Expo Router file tree:

```
app/
├── _layout.tsx                  # AuthProvider + QueryClientProvider + configureRepository
│                                #   + polyfills + theme; the ONLY boot file
├── (auth)/
│   ├── _layout.tsx              # redirects to /(app) when isAuthenticated
│   └── sign-in.tsx              # email -> 6-digit code -> verifyOtp   [/login]
│
├── (app)/
│   ├── _layout.tsx              # THE GUARD: !isAuthenticated -> redirect to /(auth)/sign-in,
│   │                            #   preserving the intended href. The native RequireAuth.
│   ├── (tabs)/
│   │   ├── _layout.tsx          # bottom tabs; Today carries the due badge (useNavBadges)
│   │   ├── index.tsx            # Today                                 [/]
│   │   ├── library.tsx          # Library / All Decks                   [/decks]
│   │   └── progress.tsx         # Progress overview                     [/progress]
│   │
│   ├── deck/[id].tsx            # Deck page, or Collection view if it has children  [/decks/:id]
│   ├── card/[id]/study.tsx      # non-committing study preview          [/cards/:id/study]
│   ├── card/[id]/edit.tsx       # authoring (Phase 8)                   [/cards/:id/edit]
│   ├── deck/[deckId]/card/new.tsx  #                                    [/decks/:deckId/cards/new]
│   ├── progress/history.tsx     # Review history                        [/progress/history]
│   ├── settings/index.tsx       # Account settings                      [/settings]
│   ├── settings/[section].tsx   #                                       [/settings/:section]
│   │
│   └── (modal)/
│       ├── adjust-session.tsx   # AdjustSessionDialog -> a native sheet
│       └── deck-settings.tsx    # DeckSettings -> a native sheet
│
└── review.tsx                   # FULL-SCREEN, OUTSIDE the tab group but inside (app).
                                 #   headerShown:false, no tab bar, gestureEnabled:false
                                 #   accepts ?deck= and ?limit=          [/review]
```

**Design notes:**

- **Tab vs stack.** Today · Library · Progress are exactly the three `primaryNavLinks` the web `TopNav` carries, and they are peer destinations — a bottom tab bar is the correct native idiom. Everything else (deck, card, history, settings) is a **stack push within the active tab**, so Library → Deck → Card preserves a natural back stack, and switching tabs preserves each stack independently. `CURRENT_STATE.md` §4 records that `BottomNav.tsx` was deleted from web as a deliberate call; that decision is about the *web* shell and does not bind native.
- **Immersive Review.** `/review` lives inside `(app)` but **outside `(tabs)`**, mirroring web's structural separation of `ReviewPage` from `AppShell`. Chrome-free by construction, not by hiding it. `gestureEnabled: false` on the screen so a swipe-back cannot silently abandon a session mid-grade — the web equivalent is that Exit is an explicit control. Exit and "Back to Today" both `router.replace('/(tabs)')`, which unmounts the screen and therefore ends the queue snapshot, preserving `useSessionQueue`'s lifecycle contract exactly.
- **Modals.** `AdjustSessionDialog` and `DeckSettings` become native sheets (`presentation: 'modal'` / `'formSheet'`). Web already renders both as bottom sheets below 480px, so the interaction model is already designed.
- **Back navigation.** Hardware back on Android maps to the stack automatically. The one place it must be intercepted is `/review` mid-session (confirm-to-exit), matching the deliberate friction Exit already has.
- **Deep linking.** Register a scheme in `app.json` for `itera://deck/<id>` and `itera://review?deck=<id>` — useful for notifications later. **Not required for auth** (that is the whole point of the OTP decision).
- **Authenticated route group.** One `_layout.tsx` guard, one place, exactly as web has one `RequireAuth`. The guard reads the shared `resolveAuthState`.
- **Roadmaps** (`/roadmaps`) is **deliberately absent**. It is out of scope per `features.md`, and its hand-built SVG canvas plus pointer-drag editing is a poor phone target. Record it as web-only-by-decision.
- **`/design-preview/*`** — optional. A `__dev__`-gated route group is cheap and would give native the same "six interactions against fixtures" surface that keeps the web previews from drifting. Recommended in Phase 7, not before.

---

## 10. Feature-parity matrix

Difficulty: T=trivial, S=small, M=medium, H=hard. Risk = risk of *silent behavioural divergence*, not of implementation difficulty.

### App shell

| Feature | Web implementation | Shared logic available? | Native implementation needed | Diff | Risk |
|---|---|---|---|---|---|
| Login | `LoginPage`, `SignInPanel`, `LearningCardsIllustration` | `resolveAuthState`, `AuthProvider`, `BOOTSTRAP_ERROR` | Sign-in screen, email → 6-digit code → `verifyOtp` | S | **High** (auth-mode invariant) |
| Route guard | `RequireAuth` | `resolveAuthState` | `(app)/_layout.tsx` redirect | S | **High** |
| Navigation | `AppShell` + `TopNav` | `primaryNavLinks` (semantic) | Bottom tabs + stacks | S | Low |
| Streak badge | `StreakBadge` | `computeStreak` | Tab-bar / header badge | T | Low |
| Due badge | `useNavBadges` | `useDueCards` | Tab badge | T | Low |
| Account menu | `AccountMenu` + `FloatingPanel` | identity from `AuthProvider` | Native sheet or a Settings screen row group | S | Low |
| Settings shell | `AccountSettingsPage` + `SettingsNav` | `settingsSections` (semantic) | Stack screen + list | S | Low |
| Sign out | `AccountMenuContent` | `AuthProvider.signOut` | Settings row | T | Low |
| "Soon" placeholders | focusable `aria-disabled` + pill | — | Disabled-styled rows with a Soon pill, still accessible | T | Low |

### Today

| Feature | Web | Shared? | Native needed | Diff | Risk |
|---|---|---|---|---|---|
| Suggested Session hero | `SuggestedSessionHero` (pixel-tuned 4-layer stack) | `summarizeDueQueue`, `estimateSessionMinutes` | A native card stack. **Do not chase pixel parity** — the web geometry is explicitly locked and phone-hostile | M | Low |
| Caught-up / new-user / loading states | `TodayPage` | `nextDueAt` | Same three states | S | Low |
| Current streak | `MomentumPanel` | `computeStreak`, `formatDayCount` | Row | T | **High** if re-derived |
| Retention | `MomentumPanel` | `computeRetention` | Row (em dash, never `0%`, when nothing mature) | T | **High** |
| Due today | `MomentumPanel` | `useDueCards` | Row | T | Med |
| Next milestone | `MomentumPanel` | `selectNextMilestone` | Row | T | Low |
| Continue Learning | `ContinueLearningList` | `buildContinueLearning`, `deckMetrics` | List | S | Med |
| Pace chart | `PaceChart` (hand-rolled SVG) | `computePaceSeries` + extracted geometry | `react-native-svg` | S | Low |
| Adjust session | `AdjustSessionDialog` | `subtreeIds`, `resolveSessionLimit` | Native sheet | S | Low |

### Library

| Feature | Web | Shared? | Native needed | Diff | Risk |
|---|---|---|---|---|---|
| Collection nav tree | `CollectionNav` + `collectionTree` | `collectionTree` (**must move to core**) | Drill-down list or a drawer | M | **High** if re-derived |
| All Decks list | `LibraryBrowserPage` | `deckMetrics`, `sortDecks` | `FlatList` | M | Low |
| Collection identity view | `LibraryCollectionView` | `aggregateMetrics` | Screen | S | Low |
| Deck page (Cards tab) | `LibraryDeckPage` + `CardTable` | `RowMeta` projection, `deckMetrics` | `FlatList` of rows | M | Low |
| Search (deck names) | `LibraryBrowserPage` | in-memory filter | Native input | S | Low |
| Card search / type / status / sort | Deck toolbar | `searchableText`, `search()` | Filter sheet | M | Med |
| Pagination (10 decks / 7 cards) | always-on footers | — | **Replace with infinite `FlatList` scroll** — deliberate divergence | S | Low |
| Due counts / mastery / last-studied | `DeckRow`, `MasteryRing`, `MeterBar` | `deckMetrics` | Native | S | Med |
| Create deck | `useCreateDeck` + dialog | hook shared | Native sheet | S | Low |
| Rename / delete deck | dialogs | hooks shared | Native sheet + destructive confirm | S | Low |
| Deck settings (incl. parent) | `DeckSettings` | `useSaveDeck`, tree helpers | Native sheet | M | Low |
| Drag-reorder cards | dnd-kit | `useReorderCards` | Defer — a desktop authoring affordance | M | Low |
| Row kebab (Edit/Duplicate/Move/Suspend/Delete) | `OverflowMenu` | hooks shared | Long-press action sheet | S | Low |

### Card authoring (all six)

| Feature | Web | Shared? | Native needed | Diff | Risk |
|---|---|---|---|---|---|
| Type chooser | `CardTypeChooser` | `interactionTypeMeta` (semantic half) | Native grid | S | Low |
| Recall editor | `RecallEditorShell` | `recallForm`, `validateRecallForm`, `saveRecallCard` | Fields | S | Low |
| Multiple Choice editor | `MultipleChoiceEditorShell` | `multipleChoiceForm`, save | Option rows + add/remove | M | Low |
| Write Code editor | `WriteCodeEditorShell` | `writeCodeForm`, save | **Needs the code-editing decision** | **H** | Med |
| Ordering editor | `OrderingEditorShell` | `orderingForm`, save | Reorderable rows | M | Low |
| Matching editor | `MatchingEditorShell` + `MatchingColumnEditor` | `matchingForm` (incl. `MAX_MATCHING_VALUE_COLUMNS`), save | **Hardest editor on a phone** | **H** | Med |
| Walkthrough editor | `WalkthroughEditorShell` + `WalkthroughStepEditor` | `walkthroughForm`, save | Step list + per-step response editor + line ranges | **H** | Med |
| Organize (deck + tags) | `CardOrganizeFields` | — | Pickers | S | Low |
| Live preview | `*LivePreview` → production views | interaction behaviours | Same components as review | S | Low |
| Prompt-length warning | `promptLength` | shared | Same copy | T | Low |

### Preview

| Feature | Web | Shared? | Native | Diff | Risk |
|---|---|---|---|---|---|
| `/cards/:id/study` | `CardStudyPreviewPage` | interaction behaviours | Same review screen, `hideRating`, fresh baseline | S | Low |
| `/preview` deck flip-through | `PreviewPage` + prev/next | — | Swipe between cards | M | Low |

### Review

| Feature | Web | Shared? | Native | Diff | Risk |
|---|---|---|---|---|---|
| Session queue snapshot | `useSessionQueue` | **the hook is pure React — share it** | Same, keyed identically | T | **High** if re-implemented |
| `?deck=` / `?limit=` | `ReviewPage` | `subtreeIds`, `resolveSessionLimit` | Expo Router params | S | Med |
| Two-phase flow + phase machine | `reviewPhase.ts` | **shared reducer** | Bind to native views | S | **High** |
| Recall | `RecallView` + `FlipCard` | behaviour | Reanimated flip | S | Low |
| Multiple Choice | `MultipleChoiceView` | `gradeMultipleChoice` | Pressable rows | S | Low |
| Write Code | `WriteCodeView` | `matchesAcceptedAnswer` | **code input decision** | **H** | Med |
| Ordering | `OrderingView`/`OrderingRow` | `gradeOrdering` | Drag list + explicit Submit | M | Med |
| Matching | `MatchingView`/`MatchingBoard` | `gradeMatching`, `matchingBadgeGeometry` | `onLayout` + `react-native-svg` | **H** | Med |
| Walkthrough | `WalkthroughView`/`StepResponse` | `gradeWalkthrough`, `focusLines`, step `state.ts` | Steps + code focus | **H** | Med |
| Tip (pre-reveal) | `TipPanel` | LOCKED semantics | Collapsible, **never a side panel** | T | Med |
| Explanation (post-reveal, before rating) | `ExplanationPanel` | LOCKED semantics | Same placement | T | Med |
| FSRS rating controls | `RatingControls` + `previewNextStates` + `formatInterval` | shared | 2×2 grid; numeric shortcuts drop | S | **High** |
| Suggested rating from `ObjectiveResult` | `ReviewSessionScreen` | shared logic | Same (3 / 2 partial / 1) | T | **High** |
| Persistence pending | phase `rating` | shared | Disabled ratings | S | **High** |
| Persist failure + retry | `persistFailed`, `ReviewPersistError`, `describeReviewCommitFailure` | shared copy + `reviewGuarantee` | Inline alert + Try again, re-sending the **identical** result | M | **HIGHEST** |
| Completion + Undo | `ReviewSessionV2` | `useUndoGrade`, `revertReview` | Completion screen | S | **High** |
| Scoped sessions from Today/Progress | link building | `subtreeIds` | Router params | T | Low |

### Progress

| Feature | Web | Shared? | Native | Diff | Risk |
|---|---|---|---|---|---|
| 5 KPIs (Learned·Due·Reviews·Retention·Streak) | `KpiTile` | `computeKpis` | Tiles | S | **High** |
| Date range + previous period | `DateRangePicker`, `dateRange` | shared | Segmented control | S | Med |
| Activity heat map | `ActivityHeatmap` | `HeatmapDay` + extracted `toWeeks` | `<View>` grid | M | Med |
| Retention chart (gap-aware) | `RetentionChart` + `retentionChartPath` | **projection already pure** | `react-native-svg` | M | Low |
| Deck Performance (leaf/actionable) | `DeckPerformanceTable` | leaf rules + ordering | List | M | Med |
| Recent milestones | `RecentMilestones` | derived | List | S | Low |
| Review history + filters | `ReviewHistoryPage` | `reviewHistory`, `cardDeckIndex` | `FlatList` + filter sheet | M | Med |
| "Soon" sidebar rows | 7 `aria-disabled` rows | — | Disabled rows | T | Low |

### Import / Export

| Feature | Web | Shared? | Native | Diff | Risk |
|---|---|---|---|---|---|
| Export JSON | `downloadText` | `exportBackup(repo)`, `serializeBackup` | `expo-file-system` + `expo-sharing` | S | Low |
| Import (Merge) | `<input type="file">` | `parseBackup`, `importBackup(repo, …)` | `expo-document-picker` | S | **High** (validation must not be re-implemented) |
| Import (Replace) | offered only when `importGuarantee === 'transactional'` | `canReplaceImport(repo)` | **Hidden on mobile** — Supabase is `best-effort`, exactly as web already does in cloud mode | T | Med |
| Failure copy | `describeImportFailure` | shared | Same, never raw backend text | T | Med |

### Roadmaps

| Feature | Status |
|---|---|
| `/roadmaps`, `/roadmaps/:id`, `RoadmapCanvas` | **Out of scope on mobile, by existing decision.** `features.md` lists Roadmaps under "Explicitly out of scope"; `CURRENT_STATE.md` §3/§14 records it as the last reskinned-only surface, deliberately outside primary nav, receiving no new development. Its data (type, repo member, Supabase table, backup inclusion) stays intact and shared. **Do not treat its absence on mobile as a parity gap** — record it in `docs/platform-parity.md` as `web-only (decision)`. |

---

## 11. Six interaction port analysis

### 11.1 Recall — **trivial/small**

- **Shared:** nothing to grade (self-graded, no grader file). `RecallInteraction`, `AuthoringPreset`, prompt/answer as `RichContent`.
- **Web-specific UI:** `FlipCard` (CSS `perspective` + `rotateY` + `backface-visibility`, `.itera-flip*` in `index.css`), `RichText`, `LazyCodeView` for fenced code in the answer.
- **Native model:** tap the card to flip. React Native supports `transform: [{ rotateY }]` and `backfaceVisibility: 'hidden'` natively; drive with Reanimated. Honour `prefers-reduced-motion` via `AccessibilityInfo.isReduceMotionEnabled` — the web CSS already has the reduced-motion branch, so the *behaviour* is decided, only the API differs.
- **Risks:** if the 3D flip proves unstable on low-end Android, a cross-fade is an acceptable substitute. The flip is presentation; the two-phase flow is the contract.
- **Visual parity:** not appropriate to force. Semantic parity = one continuous element across the reveal, Tip before, Explanation after, then rating.

### 11.2 Multiple Choice — **trivial/small**

- **Shared:** `gradeMultipleChoice` (exact-set), `selectionMode`, `randomizeOptions`, `isResponseReady`. Note the web view and the grader deliberately share one function so pass/fail and highlighting cannot drift — keep that.
- **Web-specific:** `aria-checked` option rows, circular marker + navy tint, footer Submit.
- **Native:** `Pressable` rows with `accessibilityRole="radio"|"checkbox"` and `accessibilityState={{checked}}`. Submit as a bottom action.
- **Risks:** minimal. Long options need `InlineText` (the shared parser) rather than plain `<Text>`.
- **Visual parity:** close parity is achievable and worth having; this is the cheapest recognisable win.

### 11.3 Write Code — **hard**

- **Shared:** `matchesAcceptedAnswer` — line-ending normalization + outer trim + per-line trailing-whitespace trim, `comparison` flags, `acceptedAnswers`. **This is the entire grading semantics and it ports unchanged.** Note `editableRegion?` is intentionally unconsumed today (whole block editable) — keep it unconsumed on native too, or the two platforms grade differently.
- **Web-specific:** CodeMirror 6 `EditorView`, `@codemirror/lang-*`, `oneDark`/`defaultHighlightStyle`, `LazyCodeEditor`, gutters, `.cm-hl-line` decorations.
- **Native options, ranked:**
  1. **Shared Lezer tokenizer → `<Text>` spans, plus a plain `TextInput` for editing.** `@lezer/cpp`/`@lezer/javascript`/`@lezer/python`/`@lezer/rust` and `@lezer/highlight` are **pure JS with no DOM dependency** — they are what CodeMirror's language packages are built on. A shared `tokenizeCode(source, language) → {text, style}[]` in `packages/core` would give *identical* highlighting on both platforms, and could even replace web's read-only `CodeView` later. **Recommended for read-only display.** Editing stays a plain monospace `TextInput`.
  2. **Expo DOM component (`'use dom'`)** hosting the existing `CodeEditor` in an offscreen WebView. Maximum fidelity, zero re-implementation, but a WebView per card: memory, startup latency, and a keyboard/scroll integration that fights the native scroll view. **The escape hatch, not the default.**
  3. Plain `TextInput`, no highlighting anywhere. Cheapest; loses the "code is a first-class concept" identity that defines this product.
- **Software keyboard:** `autoCorrect={false}`, `autoCapitalize="none"`, `spellCheck={false}`, `keyboardType="ascii-capable"`. Add an `InputAccessoryView` (iOS) / sticky toolbar (Android) with `Tab`, `{`, `}`, `(`, `)`, `;`, `<`, `>`, `_`. Without this, typing C++ on a phone is genuinely hostile.
- **Monospace layout + horizontal scroll:** a horizontal `ScrollView` wrapping a non-wrapping `<Text>`/`TextInput`. Do **not** soft-wrap code — it destroys indentation, which is exactly what the grader's per-line trimming preserves.
- **Do not build a mobile IDE.** No autocomplete, no bracket matching, no multi-cursor. The learner is reproducing a known short answer, not developing.
- **Visual parity:** not appropriate. Semantic parity = same accepted-answer comparison, same starter code, same one editable block.

### 11.4 Ordering — **medium**

- **Shared:** `gradeOrdering` (position-wise, partial credit), `isOrderingResponseReady`, `shuffle`, and the deterministic non-randomized id-sort scramble.
- **Web-specific:** `@dnd-kit/{core,sortable}`, `PointerSensor` + `KeyboardSensor`, the whole-row drag target and decorative 3×4 dot grip (D164-D165), `aria-live` announcements.
- **Native options:**
  1. **`react-native-draggable-flatlist`** (Reanimated + Gesture Handler) — long-press to lift, drag to reorder. The closest analogue and the common idiom.
  2. Hand-rolled Reanimated `Gesture.Pan()` — full control, more code.
  3. Explicit up/down buttons only — accessible and trivial, but poor as the primary affordance.
- **Recommendation:** (1) as primary **plus** always-visible up/down controls. Native has no keyboard-drag equivalent to web's Space → arrows → Space flow, so the buttons *are* the accessibility path, not a fallback. Note `OrderingRow.tsx`'s stated invariant (controls never removed from the tree) has a direct native reading: never `display: none` them, only fade.
- **Preserve:** the card surface is deliberately inert; **only "Submit answer" flips it** (D-2026-08-15). A tap-anywhere-to-reveal on native would silently change grading behaviour.
- **Risks:** drag inside a vertically scrolling screen needs careful gesture arbitration — long-press activation, and `simultaneousHandlers` tuning.
- **Visual parity:** partial. Keep the grip motif and row rhythm; the drag mechanics differ.

### 11.5 Matching — **hardest**

- **Shared:** `gradeMatching` (partial credit per cell, `fixed` shared columns, any column count), `isMatchingResponseReady`, `MAX_MATCHING_VALUE_COLUMNS`, and **`matchingBadgeGeometry.ts` unchanged** (pure cubic-curve midpoint placement with collision resolution).
- **Web-specific:** `MatchingBoard`'s measurement via `offsetLeft`/`offsetTop` (deliberately *not* `getBoundingClientRect`, because it renders inside FlipCard's rotated container), SVG `<path>` connectors, `useLayoutEffect` re-measurement.
- **Native:** `onLayout` gives `{x, y, width, height}` relative to the parent — a **cleaner** analogue than web's offsetParent chain, and immune to the flip-rotation problem that forced the offset approach in the first place. Connectors via `react-native-svg` `<Path>` with the identical `d` strings the shared geometry already produces.
- **Interaction model — tap-to-match, not drag.** Tap a term to select it, tap a value to connect; tap a connection to clear it. Drag-to-connect across columns on a 390px screen with a 44px minimum touch target is not viable, and `features.md` already lists a "stepwise pairing flow on mobile" as the intended unbuilt answer.
- **Column constraint:** two columns lay out side by side at 390px (verified on web). **Three columns do not.** Recommendation: native renders 2-column cards as a connected board, and 3-column cards as a **stepwise flow** — one term at a time, choose its value in column 2, then column 3, with a review-all step before Submit. This finally answers `CURRENT_STATE.md` §14's open item, and the answer should be fed back to web.
- **Risks:** highest re-implementation surface of the six; the badge-collision behaviour is subtle and its correctness depends on the shared geometry module actually being used rather than re-derived.
- **Visual parity:** not appropriate for 3-column. For 2-column, keep the connector-as-primary-state-indicator rule (never colour alone), the check/X badges, and the "state the correct value in text for every wrong row" behaviour.

### 11.6 Walkthrough — **medium-hard**

- **Shared:** `gradeWalkthrough` (dispatches per step by `response.type`), `focusLines.ts`, `walkthrough/state.ts`, and the LOCKED rule that a multi-step card yields **exactly one card-level FSRS rating** at the end.
- **Web-specific:** `LazyCodeView` with `highlightLines` (CodeMirror line decorations), the opt-out of the shell's scale/rotate entrance so glyphs stay crisp.
- **Native:**
  - **Code focus/highlight:** with the shared tokenizer (§11.3 option 1), a line is a `<View>` wrapping a `<Text>` — highlighting is a background colour plus a left border, which is *simpler* than a CodeMirror decoration. Auto-scroll the focused range into view.
  - **Steps:** a horizontal pager or Prev/Next with a step indicator. Keep the code pinned and let the step content scroll beneath, so the learner never loses the code while answering.
  - **Tip/Explanation:** the two-scope rule ports verbatim — card-wide tip available throughout, card-wide explanation after the final step; the active step shows its own tip before its first submission and its own explanation after, and returning to an answered step shows the explanation, not the tip.
  - **Rating:** only after the last step. The grade bar stays locked until then.
- **Risks:** the trickiest layout of the six on a small screen — code + step prompt + response control + tip must coexist. Expect real iteration.
- **Visual parity:** not appropriate. Semantic parity on the step machine and the single card-level rating is mandatory.

**Most native design iteration expected, in order: Matching (3-column), Write Code, Walkthrough.** Recall and Multiple Choice should land close to first-try.

---

## 12. Native-specific difficult areas, ranked

**Trivial**
- Moving `types` and `domain` into core — mechanical, compiler-verified.
- KPI tiles, Momentum rows, streak/due badges, "Soon" placeholder rows.
- `newId()` on native — one polyfill import, no code change.
- Recall flip, Multiple Choice selection.
- Activity heat map (a `<View>` grid; no SVG).

**Small**
- `configureRepository` + hook extraction (mechanical, but the highest-consequence mechanical step).
- `SupabaseRepository` client injection.
- Native Supabase client + OTP sign-in.
- Expo Router structure + the `(app)` guard.
- Charts once the geometry is shared — `react-native-svg` consumes the same coordinates.
- Import/export via `expo-document-picker` / `expo-file-system` / `expo-sharing`.
- `RichText` parser extraction and a native renderer.

**Medium**
- Moving web into `apps/web` — mechanical but broad; every failure is path-shaped.
- Metro monorepo configuration and React version alignment (§17).
- `AuthProvider` injection without weakening the P1-3 invariant.
- Library navigation: web's Collection sidebar + pagination is desktop-shaped and needs a genuine native redesign, not a port.
- Ordering drag with gesture arbitration inside a scroll view.
- Review shell: phase machine binding, persistence-pending/failure/retry UX, completion + Undo.
- Progress charts at phone width.
- Design-token translation from CSS variables to `StyleSheet` (§14).

**Hard**
- **Write Code editing on a phone** — no drop-in exists; needs a product decision plus a keyboard-accessory design (§22 D5).
- **Matching, especially 3-column** — measurement, connectors, and a pairing model web has not solved either.
- **Walkthrough layout** — the densest screen in the product on the smallest surface.
- **Authoring parity for all six editors** — six form surfaces including matching-column and walkthrough-step editors, all designed for a mouse and a wide viewport.
- **Offline mobile (the later milestone)** — a second `Repository`, a sync decorator, tombstones, and scheduling reconciliation by ReviewLog replay.
- **Keeping parity over time** — the ongoing organisational problem, not a technical one (§20).

---

## 13. Shared RichText / code strategy

**Split the parser from the renderer.** `RichText.tsx` today has three pure pieces (`splitBlocks`, and the split regexes inside `emphasis`/`inline`) interleaved with JSX construction.

**Extract into `packages/core/src/text/richText.ts`:**

```ts
export type RichNode =
  | { kind: 'paragraph'; children: RichInline[] }
  | { kind: 'code'; language: string; value: string }
export type RichInline =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'inlineCode'; value: string }

export function parseRichContent(source: string): RichNode[]
export function parseRichInline(source: string): RichInline[]   // for InlineText
```

Then `apps/web/src/components/text/RichText.tsx` maps `RichNode[]` → `<div>`/`<strong>`/`<em>`/`<code>`/`LazyCodeView`, and `apps/mobile/src/components/RichText.tsx` maps the same array → `<Text>` with `fontWeight`/`fontStyle` and a `CodeBlock` component. Neither can invent a different tokenization.

**Properties that must survive the extraction, and be tested during it** (the parser has **no test file today** — write one as part of Step 1.6):
- Fenced ```` ```lang ```` blocks split before inline processing.
- Inline `` `code` `` takes precedence over emphasis; its contents stay literal.
- `**bold**` wins over `*italic*`.
- **Underscores are deliberately not emphasis markers**, so `snake_case` stays literal. This is a stated product decision and the single most likely thing a native re-implementation would get wrong.
- Nodes are built structurally, never from a raw HTML string — XSS-safety is a property of the *renderer*, and the native renderer must preserve it by never using `dangerouslySetInnerHTML`-equivalents.

**Inline code:** a `RichInline` node; web renders the existing `bg-panel-2`/`text-accent` pill, native renders a `<Text>` with a monospace family and a token-derived background.

**Fenced code / `CodeView`:** the strategy in §11.3 — a shared `tokenizeCode()` built on `@lezer/*` (pure JS, no DOM) producing `{text, style}[]`, rendered as `<span>`s on web and `<Text>` children on native. This is the highest-leverage optional extraction in the whole plan: it would give identical syntax highlighting on both platforms and eventually let web's read-only `CodeView` drop CodeMirror (keeping it only for the *editor*). **Not required for the first native client** — a monospace unhighlighted `<Text>` is an acceptable Phase 7 starting point — but it is where this should end up.

**Technical metadata** (`language`, `focus` line ranges, `WriteCodeInteraction.comparison`) is already plain data on the card and needs no extraction at all.

---

## 14. Design-system strategy

**Do not share CSS. Share token values.**

**Create `packages/tokens`** as a platform-neutral TS module — the single source of truth for:
- The `--itera-*` palette: `navy`, `canvas`, `surface`, `surfaceSubtle`, `ink`, `inkBrand`, `muted`, `mutedLight`, `border`, `borderStrong`, `accent`/`accentHover`/`accentActive`/`accentSoft`/`accentSofter`, `navySoft`, `selectionSoft`/`selectionBorder`, `success`/`successSoft`, `error`/`errorSoft`, `warning`/`warningSoft`.
- Radii: `control` 9, `card` 14, `dialog` 16, `pill` 999.
- Type families: Inter (sans), JetBrains Mono (mono), and the finalized weights (headings 650, body/UI 400-600).
- Shadow *intent* names (`card`, `float`) — the values differ per platform (`box-shadow` vs `elevation`/`shadowOpacity`), so share the name and the intent, not the string.
- **Semantic icon names** (`streak`, `due`, `recall`, `multiple_choice`, …) so web resolves to `lucide-react` and native to `lucide-react-native` from one mapping.

**Keeping web and the token module in sync without a build step:** `index.css` stays the web source, and a **drift test** in `apps/web` parses the `.itera-scope` block and asserts every `--itera-*` value equals the module. No generated CSS, no watch process, and a mismatch fails the existing gate. This matches the repository's established style (hand-built, test-enforced) and respects the note in `index.css` that the semantic re-point mechanism must not be "simplified away".

**Native consumes the tokens through a `theme` module** producing `StyleSheet` objects. **Recommend plain `StyleSheet` over NativeWind** for the first client: NativeWind is an extra dependency, an extra Metro/Babel transform, and an extra failure mode, and it would tempt literal class-name copying — which is exactly the pixel-parity trap to avoid.

**What must NOT be copied literally to mobile:**

| Web pattern | Why not, and what to do instead |
|---|---|
| `TopNav` horizontal nav | Bottom tabs |
| `FloatingPanel` anchored popovers | Native sheets / action sheets |
| Local page sidebars (`CollectionNav`, `ProgressNav`, `SettingsNav`) | Drill-down stacks or segmented controls |
| Always-on pagination footers (10 decks / 7 cards) | Infinite `FlatList` scroll |
| The Deck page's deliberate horizontal table scroll | Vertical card rows |
| `SuggestedSessionHero`'s pixel-tuned 4-layer stack | A native card stack in the same spirit; its geometry is explicitly locked to a desktop composition |
| Hover states | No hover exists; design press/active states |
| Keyboard shortcuts (Space / Enter / 1-4 / arrows) | No native equivalent; tap affordances must be self-sufficient |
| Focus rings and `manageFocus` | Native accessibility focus and `accessibilityRole`/`accessibilityState` |
| `max-w-[1280px]` centred frame, `max-w-2xl` card column | Full-width with padding; the flashcard column is a desktop reading-measure decision |
| 44px control heights tuned for pointer precision | 44-48pt minimum touch targets — coincidentally similar, but decided independently |

**What must be preserved verbatim:** the orange restraint rule (one primary orange action plus at most two or three minor accents per screen), the light-only palette (there is no dark palette; do not invent one for native — see `CURRENT_STATE.md` §4), the LOCKED/DIRECTION/CONCEPT reference tiers, the standing rule that a mockup element with no backing feature is omitted or shown as a disabled "Soon" row rather than fabricated, and reduced-motion respect (`AccessibilityInfo.isReduceMotionEnabled` is the native reading of `prefers-reduced-motion`).

Note `C:\Users\SK\Desktop\itera-mockups\mobile\` already exists and should be treated under the same tier rules before any native screen is designed.

---

## 15. Progress / chart strategy

**Separate series computation from rendering.** The repository has already done most of this.

**Already shared (moves as-is):**
- `progressMetrics.ts` — `computeKpis`, `computeRetention`, `HeatmapDay`/`HEATMAP_RANGE_OPTIONS`, `RetentionPoint` series, leaf-deck performance rows, milestone derivation.
- `todayMetrics.ts` — `computePaceSeries`.
- `dateRange.ts` — presets, `buildRange`/`previousPeriod`, Today/Yesterday labels.
- `cardDeckIndex.ts` — `buildCardDeckMap` for attribution.
- `retentionChartPath.ts` — **already a pure projection into chart coordinates**, and it exists precisely so line segments and standalone markers cannot drift. Move it into `core/charts/` and both platforms consume identical geometry.

**Needs a small extraction:** `PaceChart`'s `axisMaxFor`/`chartPoint` and `ActivityHeatmap`'s `toWeeks`, both pure functions currently defined inside component files.

**Rendering per platform:**

| Chart | Web | Native |
|---|---|---|
| KPI tiles | `KpiTile` | `<View>` + `<Text>` — no library |
| Activity heat map | CSS grid of divs | `<View>` grid — **no SVG needed** |
| Retention line chart | hand-rolled `<svg>` `<path>` | `react-native-svg` `<Path>` consuming the identical `d` string |
| Pace chart | hand-rolled `<svg>` | `react-native-svg` |
| Sparkline | hand-rolled `<svg>` | `react-native-svg` |
| Deck Performance | table | `FlatList` rows |
| Milestones | list | `FlatList` |
| Mastery ring / meter bar | CSS | `react-native-svg` circle / `<View>` |

**Dependency recommendation:** `react-native-svg` only. It is Expo-first-party-supported, it is the substrate every RN charting library uses anyway, and it lets the shared projections render directly. **Do not add a native charting library** — that would violate the standing no-charting-dependency rule *and* re-derive the projections the repository deliberately owns.

**Behaviours that must survive the port:** retention gaps break the line into separate segments rather than interpolating; an observed bucket with no observed neighbour renders as a point rather than being dropped; Retention shows an em dash, never `0%`, when nothing is mature; the pace chart has no target line (there is no goal concept); Deck Performance lists leaf/actionable decks only and has no Trend column.

---

## 16. Testing / parity strategy

### Three suites, one source of expected values

| Suite | Runner | Scope |
|---|---|---|
| **`packages/core`** | **Vitest**, `environment: 'node'` | All 35 relocated domain test files + the Supabase repository suites (pagination edge matrix, backup completeness, review RPC contract, backend parity) + the new parity suite. **Every behavioural rule is asserted exactly once, here.** |
| **`apps/web`** | Vitest + `happy-dom` opt-in + Playwright | Component tests, `RequireAuth`/`LoginPage`, dialogs/download, Dexie transaction suites, the token drift test, browser verification. |
| **`apps/mobile`** | **`jest-expo` + `@testing-library/react-native`** | Native components and screens only. **Never re-tests domain logic.** |

**Vitest vs Jest — do not try to unify.** Vitest cannot transform React Native's source cleanly (Flow types, platform extensions, the Metro/Babel pipeline), and `jest-expo` exists to do exactly that. The correct answer is not one runner; it is **one place where behaviour is asserted**. Core is Vitest because it is plain Node code and 35 test files already work there. Mobile's Jest suite tests rendering and interaction, nothing else. Two runners with zero overlapping assertions is a smaller problem than one runner with a fragile transform.

Keep the existing conventions in core: colocated `*.test.ts`, `globals` not enabled (explicit `vitest` imports), `*.dst.test.ts` files pinning `Europe/Belgrade` via `src/test/timeZone.ts`. **The DST suite is one of the most valuable things being shared** — it must run in core, where both platforms depend on it.

### The canonical parity fixture

`packages/core/src/fixtures/parityWorkspace.ts` — extends the existing `backupFixtures.ts` (which already holds one valid card of every interaction type) into a complete deterministic workspace:

```ts
export const PARITY_NOW: Millis            // a fixed instant, mid-afternoon local
export const parityWorkspace: WorkspaceSnapshot
export const PARITY_EXPECTATIONS: { ... }  // the single source of expected values
```

Contents:
- **Nested decks** — a Collection with two leaf children, a leaf at top level, an empty deck, and a deck with cards filed directly on it *and* children (the known Continue-Learning/Deck-Performance edge case).
- **All six interactions**, including a 2-column and a 3-column Matching card, a Walkthrough with per-step tip/explanation, and a Write Code card with multiple accepted answers.
- **Scheduling variety** — `new`, `learning`, `review`, `relearning`; overdue, due exactly at `PARITY_NOW`, and due tomorrow; one `suspended: true` card that is due (must be excluded).
- **ReviewLogs** — spanning a DST transition; mature (`stateBefore: 'review'`) passes and failures; new/learning graduations that must **not** count toward retention; a run producing a known streak with a deliberate one-day gap; one log whose card was deleted; one log predating `dueAfter`.
- **Manual `order`** on some cards.

### Exact parity assertions

Asserted once in core against the fixture, then re-asserted per platform **through its own repository** (web: `DexieRepository` over `fake-indexeddb`; mobile: `SupabaseRepository` over `fakeSupabaseClient` with a low row cap, plus later `ExpoSqliteRepository`):

| # | Assertion |
|---|---|
| 1 | `cards.getDue({ now: PARITY_NOW })` returns an **exact ordered array of ids** — proves the due predicate, the suspended exclusion, and the `due` ascending sort |
| 2 | `getDue` with `deckId` = the Collection returns the **subtree** ids (via `subtreeIds`), not just direct children |
| 3 | `getDue` with `limit: n` truncates **after** deck/tag filtering, not before |
| 4 | `computeLearned(cards, logs)` returns an exact count and an exact id set |
| 5 | `computeRetention(logs)` returns an exact ratio, with mature-only eligibility and `null` when nothing is mature |
| 6 | `computeStreak(logs, PARITY_NOW)` returns exact `{ current, best, activeToday }`, **across the DST boundary** |
| 7 | `computePaceSeries` returns 7 exact per-day counts with the DST day in the correct bucket |
| 8 | Heat-map days: exact `{ date, count, level }` for the full range |
| 9 | Retention series: exact points **including the `null` gaps** |
| 10 | `deckMetrics` per deck: exact due count, mastery, last-studied |
| 11 | `buildContinueLearning` returns exact ordered deck ids |
| 12 | `selectNextMilestone` returns the exact milestone |
| 13 | Deck Performance rows: exact leaf set, exact ordering |
| 14 | `cards.search({text})` returns an exact ordered id array (proves `searchableText` parity) |
| 15 | `collectionTree` produces an exact node tree with exact depths and paths |
| 16 | `reviewService.submit` with a fixed `now` + rating produces a **byte-identical** `SchedulingState` and a `ReviewLog` identical except for its minted `id` |
| 17 | `previewNextStates` produces the exact four intervals for the four ratings |
| 18 | `commitReview` then `reviews.all()` shows exactly one new log and the advanced card; a forced failure leaves **both** unchanged |
| 19 | `revertReview` restores the card byte-identically and removes exactly that log |
| 20 | Every grader over a fixed response set yields exact `{correct, score}` |
| 21 | `buildBackup` → `parseBackup` round-trips the whole workspace; a log missing `stateBefore` is **rejected** |
| 22 | `resolveAuthState` over the full matrix (local/demo/supabase × configured/not × stale record) |

**Anti-vacuity discipline, as this repository already practises it:** for every parity assertion, verify it *fails* against a deliberately wrong implementation (a `+ 86_400_000` day step, a retention rule without the `stateBefore` filter, a `getDue` applying `limit` before filters). `CURRENT_STATE.md` §16 documents this method for five previous passes; it is the reason the existing test count means something.

**E2E:** out of scope for the first several phases. When it arrives: Playwright for web (already a devDependency) and Maestro for native (no code, flat YAML, works with Expo dev clients). The parity fixture doubles as the seed for both.

---

## 17. Expo / Metro / package-sharing risks

Concrete, and each with a mitigation.

1. **`import.meta` is not supported by Metro/Hermes.** Present in exactly one file (`src/data/supabase/client.ts:5-6`), reached from `src/data/index.ts` → every hook. **Mitigation:** that file never moves into core; `SupabaseRepository`'s client is injected. **Enforcement:** add a lint rule or a core test asserting no core source contains `import.meta` — this is the one leak that must be mechanically prevented, because its error message will not point at the cause.

2. **Duplicated React — the top structural risk.** `packages/core` ships React code (hooks, `AuthProvider`). Expo pins a React version per SDK; the web app is on 19.2. Two copies of React in one Metro graph produces "invalid hook call" errors that look like application bugs. **Mitigation:** hoist a single `react` at the workspace root at the version Expo requires, keep `react` as a `peerDependency` of `packages/core` (never a dependency), and configure Metro's `resolver.nodeModulesPaths` / `disableHierarchicalLookup` per Expo's documented monorepo setup. **Decide at scaffold time (§22 D1).**

3. **Metro package `exports` resolution.** Recent Expo SDKs enable `exports` support by default, which changes resolution for some transitive dependencies. **Mitigation:** keep `packages/core`'s own `package.json` minimal — `"main": "src/index.ts"`, no `exports` map, no `browser` field — so its resolution is boring on both bundlers. Verify at scaffold; if a third-party package misresolves, `resolver.unstable_enablePackageExports` is the knob.

4. **TS `paths` vs runtime resolution.** These are different mechanisms and both must work. **Mitigation:** rely on the **npm workspace symlink** for runtime resolution on both bundlers (Vite and Metro both follow `node_modules/@itera/core` → `packages/core`), and use `tsconfig.base.json` `paths` **only** for editor navigation and `tsc`. Do not make Vite's `resolve.alias` or Metro's `extraNodeModules` the primary mechanism — an alias that works in one bundler and not the other is the classic monorepo failure.

5. **Vite aliases.** `apps/web/vite.config.ts` keeps `'@' → ./src`. Do **not** add a `@itera/core` alias; the symlink handles it. One resolution mechanism, not two.

6. **Source TS vs prebuilt package.** **Ship `packages/core` as source TypeScript with no build step.** Metro transpiles TS natively via `babel-preset-expo`; Vite via esbuild; Vitest natively. A `tsc -b` watch process would be a permanent developer tax for no benefit, and its stale-output failures are confusing. Cost: consumers typecheck core's source (fine, and arguably better). **Verify in Step 1.1 that `npx tsc -b --force` stays clean across the workspace boundary** — that step exists specifically to catch this early.

7. **ESM/CJS.** The repo is `"type": "module"` throughout. `packages/core` stays ESM. Metro handles ESM source fine. Care is only needed if a CJS-only dependency ever enters core — none currently would.

8. **Platform file extensions (`.web.ts` / `.native.ts` / `.ios.ts` / `.android.ts`).** Metro resolves these; **Vite does not, without a plugin**. **Strong recommendation: forbid platform extensions inside `packages/core` entirely.** Use explicit injection instead (`configureRepository`, `SessionStore`, `getClient`). This keeps Vite configuration at zero and makes the platform boundary visible in the code rather than hidden in a filename. Inside `apps/mobile`, `.ios.tsx`/`.android.tsx` are fine — that is Metro's own territory.

9. **Metro monorepo watching.** `apps/mobile/metro.config.js` must use `getDefaultConfig(__dirname)` with `watchFolders` including the workspace root, so edits in `packages/core` trigger a fast refresh. Without it, core edits appear not to take effect — a confusing early-days failure.

10. **Hermes runtime gaps.** `crypto.getRandomValues` (fix: `react-native-get-random-values` imported first in `app/_layout.tsx` — **no change to `newId()`**), possibly `URL`/`structuredClone` for supabase-js depending on RN version, and **`Intl`** for `Intl.DateTimeFormat` in `dateRange.ts` and `todayMetrics.ts`. Modern Hermes ships Intl on both platforms, but `weekday: 'narrow'` and `month: 'short'` output must be **verified on device in Phase 3**, not assumed. If a gap appears, the fix is a small formatter adapter, not abandoning `Intl`.

11. **`ts-fsrs` on Hermes.** Pure arithmetic over `Date`. No known issue, but include a Phase 4 device assertion that `reviewState()` on native produces byte-identical output to the web/core result for a fixed input — this is the highest-consequence "probably fine" in the plan.

12. **`tsconfig.app.json` excludes `*.test.ts(x)`.** Carry this forward per app, and be aware it means test fixtures can rot silently — which is exactly why `backupFixtures.ts` and the new `parityWorkspace.ts` live in **non-test** modules.

**Overall:** the recommended setup is deliberately boring — npm workspaces, symlink resolution, source TS, no platform extensions in shared code, no build pipeline, no watch process. Every piece of cleverness here is a future debugging session.

---

## 18. Cross-device vertical slice

The **architecture validation slice** — the smallest thing that proves every seam at once. Not the intended mobile scope.

**Scenario**
1. Desktop, web app in **Supabase cloud mode**, signed in as `user@example.com`. Create a deck "C++ Fundamentals" and one **Recall** card.
2. Mobile, Expo dev client, signed in as the **same** account via 6-digit email OTP.
3. Mobile Today shows **1 due**. Tap Start session.
4. Mobile renders the Recall card, taps to reveal, taps **Good**.
5. `commit_review` writes the advanced card and its ReviewLog in one transaction.
6. Desktop refreshes: Today shows **0 due**, Momentum shows the streak active today, Progress shows Reviews +1 and the heat map cell filled, `/progress/history` shows exactly one new row with the correct rating, resulting interval and deck attribution.
7. Mobile is force-quit and relaunched: still signed in, still 0 due, next-due time correct.

**What must exist**
- A live Supabase project with `schema.sql`, `0002`, `0003`, `0004` applied. **`0004_review_commit_rpc.sql` is non-negotiable** — without it, cloud grading fails loudly by design (`SupabaseRepository` has no fallback to the card-then-log sequence).
- `packages/core` through Step 1.7; `apps/web` moved (Step 2).
- Web running in cloud mode (`VITE_SUPABASE_*` set).
- `apps/mobile`: Expo Router with `(auth)` + `(app)` groups; native Supabase client (storage adapter, `detectSessionInUrl: false`, `AppState` refresh); OTP sign-in; `configureRepository(() => new SupabaseRepository(client))`; a minimal Today reading `useDueCards`; a Review screen using the **shared** `useSessionQueue`, `reviewPhase`, `reviewService`, `usePersistReviewResult`, `RatingControls` semantics; a native `RichText` renderer.

**What may be stubbed**
- Library, Progress, authoring, settings, import/export on mobile.
- Visual design — unstyled `<Text>` is acceptable; this slice proves data flow.
- The other five interaction types (registry throws for them; that is correct behaviour).
- Tab bar (a single screen is fine).
- Undo, Adjust session, scoped sessions.
- Offline anything.

**What may NOT be stubbed** — stubbing any of these makes the slice prove nothing:
- **`reviewService.submit`.** Native must call the shared service. A native FSRS call invalidates the entire exercise.
- **`repo.commitReview`.** Not `cards.put()` + `reviews.append()`. The transaction is the point.
- **`buildReviewLog` with `stateBefore`.** A hand-built log makes retention silently wrong.
- **`resolveAuthState`.** Native must use the shared function, not its own "do I have a token?" check.
- **`useSessionQueue`.** The snapshot lifecycle must be the shared one.
- **`SupabaseRepository`.** Native must use the shared class with its `selectAll` pagination — not a hand-rolled `supabase.from('cards').select()`.
- **The persist-failure path.** Turn off the network mid-grade: the session must **not advance**, ratings stay disabled, and an inline retry re-sends the *identical* result.
- **`calendarDay` arithmetic** anywhere a day boundary is involved.

**What proves success** (each is a distinct seam, and each maps to a preserved audit fix)
1. **Cross-device read** — mobile sees a desktop-created card ⇒ `SupabaseRepository` + hooks + auth all work under Metro.
2. **`import.meta` is truly gone** — the mobile bundle builds ⇒ the config boundary holds.
3. **Identical FSRS** — the resulting `SchedulingState` on the row matches what the same input produces in a core unit test ⇒ no scheduler divergence (the highest-risk duplication).
4. **Atomic write** — exactly one card update and exactly one log row ⇒ audit §10 item 6 preserved.
5. **`stateBefore` recorded** — Progress retention counts it correctly ⇒ Milestone 3 preserved.
6. **Cross-device write-back** — desktop Today/Progress/History reflect a mobile review ⇒ the product story is real.
7. **Failure honesty** — a network-off grade shows retry and does not advance ⇒ P2-B preserved on a new platform.
8. **Session survives a cold start** — SecureStore + `AppState` refresh work ⇒ native auth is real.
9. **No stale-session admission** — clearing SecureStore signs the user out cleanly ⇒ P1-3 preserved.

**If any of 3, 4, 5 or 7 fails, stop and fix the shared boundary before writing a single additional native screen.**

---

## 19. Full phased roadmap

Standing rules for every phase: `packages/core` and `apps/web` gates (`npx vitest run`, `npx tsc -b --force`, `npm run lint`, `npm run build`) must be clean; UI work is verified in a real browser (1440×900 and 390×844) and on a real device/simulator; docs are updated in the same pass when a phase reaches finalized state; `docs/itera-decisions.md` gets a new dated entry per material decision (append-only).

---

### Phase 1 — shared-code foundation *(no Expo, no native code)*

**Goal:** `packages/core` exists and `apps/web` (still at the root) consumes it with every gate unchanged.
**Changed areas:** root `package.json`, new `packages/core` + `packages/tokens`, `src/**` imports via shims, one refactor each in hooks/auth/backup/RichText.
**Shared extraction:** Steps 1.0-1.7 in §5.
**Mobile work:** none.
**Tests:** 35 domain test files relocate; new tests for `resolveAuthState`, `parseRichContent`, the token drift check, and "`getRepository()` throws when unconfigured". **Total count must not fall.**
**Verification:** full browser pass of every route in `CURRENT_STATE.md` §18, with special attention to create-card → review → grade → Progress after Step 1.4.
**DoD:** `packages/core` builds and tests standalone; web behaviour byte-identical; no core source contains `import.meta`, `window`, `document`, `localStorage`, `react-router`, `dexie`, `@codemirror`, `@dnd-kit`, `lucide-react` or a Tailwind class string (assert this mechanically).
**Do not include:** any Expo file, the `apps/` move, NativeWind, a build step for core, platform file extensions.

---

### Phase 2 — repository restructure

**Goal:** the web app lives at `apps/web`.
**Changed areas:** file locations, `package.json` split, `vite.config.ts` / `vitest.config.ts` / `tsconfig` paths, `docs/` path references.
**Shared extraction:** none.
**Mobile:** none.
**Tests:** unchanged count, run from `apps/web`.
**Verification:** `npm run build` + `npm run preview` + a full route pass.
**DoD:** `npm run <script>` works from the root via workspace scripts; every doc path reference is correct; **tag this commit** as the pre-native checkpoint.
**Do not include:** any behaviour change, any renamed export, any "while I'm here" cleanup.

---

### Phase 3 — Expo shell + auth

**Goal:** a native app that signs in and reaches an empty authenticated screen.
**Changed areas:** `apps/mobile/**` only.
**Shared extraction:** `SessionStore` native adapter; verify `resolveAuthState` needs no change (it should not).
**Mobile work:** Expo scaffold; `metro.config.js` monorepo setup; polyfill imports; native Supabase client (storage adapter, `detectSessionInUrl: false`, `AppState` → `start/stopAutoRefresh`); `configureRepository`; Expo Router `(auth)` / `(app)` groups + guard; OTP sign-in screen; TanStack `focusManager`/`onlineManager` bindings; `expo-font` for Inter + JetBrains Mono; a `theme` module from `packages/tokens`.
**Tests:** `jest-expo` set up; the sign-in screen and the guard tested with RNTL.
**Verification on device:** sign in with a real 6-digit code; force-quit and relaunch (session persists); background 10+ minutes and resume (token refreshes, no 401); sign out (SecureStore cleared, back to sign-in); airplane mode at launch (a usable sign-in screen with the bootstrap error, **not** an infinite "Loading…"); **`Intl.DateTimeFormat` smoke check** for `weekday:'narrow'` and `month:'short'`; `newId()` produces valid v4 UUIDs.
**DoD:** all of the above pass on both iOS and Android; `packages/core` and `apps/web` untouched.
**Do not include:** any product screen, deep linking, offline, notifications.

---

### Phase 4 — cross-device Recall vertical slice ← **the architecture gate**

**Goal:** §18, exactly.
**Mobile work:** minimal Today (due count + Start), Review screen bound to shared `useSessionQueue` / `reviewPhase` / `reviewService` / `usePersistReviewResult`, `RecallView` native, `RatingControls` native, native `RichText`, persist-failure + retry UI.
**Tests:** core parity fixture + `PARITY_EXPECTATIONS` land here (§16); mobile RNTL tests for the phase machine binding and the failure/retry path.
**Verification:** the 9 success criteria in §18, on a real device against a real Supabase project.
**DoD:** all 9 pass. Apply and record `supabase/migrations/0002-0004` verification while a live project exists — this also closes three open `TODO.md` items and the §15 "unverified against a live database" caveats.
**Do not include:** other interactions, Library, Progress, authoring, styling polish.
**Escalate immediately if:** FSRS output differs, the write is not atomic, `stateBefore` is missing, or the failure path advances the session.

---

### Phase 5 — Today parity

**Goal:** native Today matches web's *behaviour* on all data and all three page states.
**Mobile:** hero (real due count, contributing deck names, duration estimate), Momentum (streak, retention, due today, next milestone), Continue Learning, pace chart via `react-native-svg`, Adjust session as a native sheet, tab bar with the due badge.
**Shared extraction:** pace-chart geometry into `core/charts/`.
**Tests:** core covers every value already; mobile tests the three page states and the Adjust-session URL/params it produces.
**Verification:** side-by-side with web on the same account — **every number identical**. Caught-up state (Adjust session **not** rendered). New-user state.
**DoD:** numbers match exactly; em dash (never `0%`) when nothing is mature; no fabricated content anywhere.
**Do not include:** Weekly Goal, achievements, advanced session controls (all deliberately deferred per `TODO.md`).

---

### Phase 6 — Library parity (read + deck management)

**Goal:** browse Collections/decks, see a deck's cards, open a card in study preview.
**Mobile:** Collection drill-down, deck list with real metrics, deck screen with card rows, search, filters as a sheet, create/rename/delete deck, deck settings sheet, card study preview.
**Shared extraction:** confirm `collectionTree` is consumed from core, not re-derived (**this is the divergence risk of this phase**).
**Tests:** core `collectionTree` parity assertions; mobile navigation tests.
**Verification:** the same deck tree, the same due counts, the same mastery, the same last-studied as web.
**DoD:** identical derived numbers; infinite scroll replaces pagination as a **recorded** deliberate divergence.
**Do not include:** authoring, card drag-reorder.

---

### Phase 7 — Review parity (all six interactions)

**Goal:** every card type reviewable on mobile.
**Mobile:** Multiple Choice, Ordering (drag + up/down), Write Code (per the §22 D5 decision), Matching (2-col board + 3-col stepwise), Walkthrough (steps + code focus), Tip/Explanation placement, completion + Undo, `?deck=`/`?limit=` scoping.
**Shared extraction:** the `InteractionBehaviour` split (Step 1.7) is consumed here; optionally the shared `tokenizeCode()`.
**Tests:** every grader already covered in core; mobile RNTL per interaction, including "wrong answer suggests rating 2 on partial credit, 1 on zero".
**Verification on device:** all six end to end; software-keyboard behaviour on Write Code; Matching at 390px; Walkthrough with a 40-line code block; the deliberately-inert Ordering card surface.
**DoD:** all six gradable; identical `ObjectiveResult` to web for the same responses (assert via the parity fixture); the registry still throws loudly for an unknown type.
**Do not include:** authoring editors; visual pixel-matching.
**Escalate on:** the Matching 3-column model (a product decision), and any grading behaviour that has to differ.

---

### Phase 8 — Progress parity

**Goal:** native Progress + Review history.
**Mobile:** 5 KPIs, date range, heat map, retention chart, Deck Performance, milestones, Review history with range/deck/rating filters.
**Shared extraction:** heat-map week bucketing into `core/charts/`.
**Verification:** every KPI, every chart point and every history row identical to web for the same account and range.
**DoD:** identical numbers; retention gaps not interpolated; isolated buckets drawn as points; leaf-only Deck Performance; the 7 "Soon" rows present and honest.
**Do not include:** new Progress features.

---

### Phase 9 — Authoring parity

**Goal:** create and edit all six card types on mobile.
**Mobile:** type chooser, six editors, Organize fields, live preview, prompt-length warning.
**Verification:** author one card of each type on mobile, review it on web, and vice versa.
**DoD:** every field the web editors expose is authorable on mobile; `saveXCard` reused verbatim (no native save path); editing preserves id/createdAt/scheduling/suspended so ReviewLog history survives.
**Do not include:** new authoring capabilities on either platform.
**Note:** the heaviest phase and the lowest value per unit effort. It is legitimate to ship mobile publicly before this and record authoring as web-first — but say so deliberately in `docs/platform-parity.md`, do not let it drift.

---

### Phase 10 — Settings, import/export, account

**Goal:** account and data management on mobile.
**Mobile:** settings screens, account/identity, sign out, export via `expo-file-system` + `expo-sharing`, import via `expo-document-picker`, Replace hidden (Supabase is `best-effort`, exactly as web already does in cloud mode), "Soon" placeholder rows.
**DoD:** a backup exported on mobile imports on web and vice versa (**round-trip through the shared validator**); failure copy never shows raw backend text.

---

### Phase 11 — Mobile offline persistence *(a real milestone, not polish)*

**Goal:** review without a connection.
**Mobile:** `ExpoSqliteRepository implements Repository`; a `SyncingRepository` decorator; an outbound queue; ReviewLog append-union; scheduling reconciliation by replay; tombstones for deletes (with a `MigrationRunner`-compliant migration).
**Tests:** the full parity fixture through `ExpoSqliteRepository`; conflict scenarios; offline→online replay.
**DoD:** offline review commits locally and syncs on reconnect with no duplicated logs and no lost grades; `reviewGuarantee: 'transactional'` genuinely holds locally.
**Escalate before starting:** the sync semantics are a decision, not an implementation detail.

---

### Phase 12 — Native polish and store readiness

App icon/splash, Expo Updates (OTA), accessibility audit (VoiceOver/TalkBack over all six interactions), reduced-motion, performance on low-end Android, error reporting, store listings, privacy disclosures, optional deep linking + notifications (`TODO.md` lists notifications as deferred product work).

---

## 20. Recommended permanent parity workflow

The goal is to make "web-only" a **decision that leaves a trace**, never an omission.

**Definition of done for any feature, from Phase 5 onward:**

```
1. Domain change lands in packages/core, with its tests, once.
2. Web behaviour resolved:    implemented, OR recorded as "native-first" with a reason.
3. Native behaviour resolved: implemented, OR recorded as "web-only" with a reason.
4. Parity assertions updated in packages/core when derived values change.
5. docs/platform-parity.md updated in the same commit.
6. All gates clean on every workspace that changed.
```

Step 3 is the load-bearing one. "Resolved" has exactly three legal values: **implemented**, **web-only (decision)**, or **deferred (issue #N, with a reason)**. There is no fourth value and no blank cell. A PR that changes learner-visible behaviour and leaves a blank is incomplete.

**Structural reinforcements, in order of leverage:**

1. **Shared code is the default location.** If a new rule can be expressed without React or a DOM/RN API, it goes in `packages/core`. The extraction in Phase 1 makes this the path of least resistance rather than an act of discipline.
2. **The parity fixture is the enforcement mechanism.** A new derived value adds an entry to `PARITY_EXPECTATIONS`; both platforms assert against it. A platform that quietly computes something else fails a test rather than a code review.
3. **Extend the "Adding an interaction" checklist** in `docs/architecture.md` with native touchpoints. The compiler already enforces most of the web ones (`searchableText`'s `never` guard, the union exhaustiveness); the registry step is the one it does not, and native adds a second registry with the same property. Both should throw loudly for a missing type.
4. **A recurring parity review** at every milestone boundary: read `docs/platform-parity.md` top to bottom and re-confirm every non-implemented row is still a deliberate decision. Cheap, and it is the only thing that catches slow drift.
5. **Deliberate platform-specific features are legitimate** — Roadmaps is web-only, notifications will be native-only — but each needs a dated `itera-decisions.md` entry, not a silent gap.

---

## 21. Proposed `docs/platform-parity.md` ownership

**Recommended: yes** — with a tightly bounded charter, because this repository's documentation set is already well-partitioned and a vague new file would become the stale planning doc `docs/README.md` warns about.

**It owns exactly one thing: the per-capability platform status table.** Nothing else.

```markdown
# Platform parity

Status of every learner-visible capability on each platform.
One row per capability. Status is one of:
  implemented | web-only (decision) | native-only (decision) | deferred
Every non-`implemented` status MUST carry a reason and, for `deferred`, an owner or issue.

| Capability | Shared logic (packages/core) | Web | Native | Status / reason |
|---|---|---|---|---|
| Current streak | computeStreak | yes | yes | implemented |
| Roadmaps | — | yes | no | web-only (decision) — features.md "out of scope"; D17 |
| Offline review | — | Dexie local mode | no | deferred — Phase 11 |
| Push notifications | — | no | planned | native-only (decision) — TODO.md |
| Card drag-reorder | useReorderCards | yes | no | web-only (decision) — desktop authoring affordance |
```

**It explicitly does NOT own:**
- *Why* a decision was made beyond one clause → `itera-decisions.md` (append-only, cited by date).
- Implementation status of the web app → `CURRENT_STATE.md`.
- What the product does → `features.md`.
- How anything is built → `architecture.md`.
- Roadmaps, phases, or future work → `CURRENT_STATE.md` §17 and `TODO.md`.

**Rules that keep it from going stale:**
- It is **updated in the same commit** as any change to a listed capability, exactly as `CURRENT_STATE.md` is today. A stale parity doc is worse than none.
- It is a **table only**. No prose sections, no plans, no rationale paragraphs. Prose is where staleness hides.
- It is added to the "Read first" tables in `CLAUDE.md` and `AGENTS.md` and to `docs/README.md`'s canonical-documents table with an explicit owns / does-not-own row, so it inherits the existing discipline.
- The shared-logic column is verifiable: it names a module in `packages/core` or is empty. A wrong entry is a broken link.

**Create it in Phase 5**, not now — the first phase where a capability can genuinely differ between platforms.

---

## 22. Risks and unresolved decisions

Ranked by consequence × how early it must be settled.

| # | Decision | Options | Recommendation | Must be decided by |
|---|---|---|---|---|
| **D1** | **React version alignment across Vite and Metro** | (a) single hoisted `react` at Expo's pinned version, web follows; (b) let each app pin its own and accept two copies; (c) delay by keeping all React code out of core | **(a).** `react` becomes a `peerDependency` of `packages/core`, hoisted once at the root. (b) breaks shared hooks with "invalid hook call". (c) means duplicating six hook files and `AuthProvider` — the exact divergence this plan exists to prevent. | **Phase 1 Step 1.0**, verified again at Phase 3 scaffold |
| **D2** | **How mobile reaches the Repository** | (a) `configureRepository()` registration; (b) React context `RepositoryProvider`; (c) per-platform module resolution | **(a).** Smallest diff, preserves every existing hook call site, needs no provider in any test tree, keeps "never import a backend from a component/hook/page" literally true. | Phase 1 Step 1.4 |
| **D3** | **Do the TanStack hooks live in core, or does each app write its own over shared functions?** | (a) hooks in core; (b) query keys + plain async functions in core, hooks per app | **(a).** They are React-but-not-DOM, work unmodified on RN, and duplicating them would duplicate `qk`, invalidation policy, and the `usePersistReviewResult` `updatedAt: log.reviewedAt` subtlety that makes retry safe. This is precisely the "meaningful cross-platform contract" bar. | Phase 1 Step 1.4 |
| **D4** | **Native session storage** | (a) AsyncStorage; (b) SecureStore with a chunking adapter; (c) refresh token in SecureStore, rest in AsyncStorage | **(b).** The ~2048-byte SecureStore warning is real for Supabase sessions; chunking is ~30 lines behind the `SessionStore` interface and keeps the refresh token out of plain sandbox storage. | Phase 3 |
| **D5** | **Code display and editing on native** | (a) shared Lezer tokenizer → `<Text>` spans (read-only) + plain `TextInput` (editing); (b) Expo DOM component hosting CodeMirror in a WebView; (c) unhighlighted monospace everywhere | **(a)**, with (b) as a named escape hatch if authoring on mobile proves unusable. (a) also opens the door to replacing web's read-only `CodeView` with the same tokenizer, which would *reduce* total code. (c) abandons the product's "code is first-class" identity. | **Phase 7** for review display; Phase 9 for editing. Do not decide earlier than needed. |
| **D6** | **Matching on a phone** | (a) 2-col board + 3-col stepwise flow; (b) stepwise for all; (c) horizontal scroll with the full board | **(a).** Two columns already lay out at 390px on web; three do not. This also finally answers the open item in `CURRENT_STATE.md` §14, and the answer should be fed back to web. | Phase 7 |
| **D7** | **Ordering drag on native** | (a) `react-native-draggable-flatlist`; (b) hand-rolled Reanimated gesture; (c) up/down buttons only | **(a) plus always-visible up/down controls.** Native has no keyboard-drag equivalent to web's Space→arrows→Space, so the buttons are the accessibility path, not a fallback. | Phase 7 |
| **D8** | **`react-native-svg` as the one new rendering dependency** | (a) yes; (b) a native charting library; (c) `<View>`-only approximations | **(a).** Expo-supported, consumes the already-shared projections, and honours the standing no-charting-library rule (a charting library would re-derive `retentionChartPath`). | Phase 5 |
| **D9** | **NativeWind or plain `StyleSheet`** | (a) `StyleSheet` from `packages/tokens`; (b) NativeWind | **(a)** for the first client. NativeWind adds a Babel/Metro transform and tempts literal class-name copying, which is the pixel-parity trap. Revisit only if styling velocity actually becomes the bottleneck. | Phase 3 |
| **D10** | **Mobile test runner** | (a) `jest-expo` + RNTL for mobile, Vitest for core/web; (b) force Vitest everywhere | **(a).** Two runners with **zero overlapping assertions** is a smaller problem than one runner with a fragile RN transform. Core is asserted once; mobile tests rendering only. | Phase 3 |
| **D11** | **Does web migrate to Supabase-only, or keep Dexie local mode?** | (a) keep both (unchanged); (b) make web cloud-only for a unified story | **(a), unchanged.** Local-first is architectural principle #1 and Dexie mode is a real, tested, shipped capability. Mobile being cloud-only is a *mobile* decision, not a product-wide one. **Consequence to state plainly:** a learner using web in local mode sees nothing on mobile. That is honest and must be surfaced in the UI eventually (it is adjacent to the open `TODO.md` item on browser-local data when an origin moves to the cloud). | Phase 3 (as messaging), Phase 10 (as UI) |
| **D12** | **Live-verifying the Supabase migrations** | (a) verify during Phase 4 while a real project exists; (b) keep deferring | **(a).** Phase 4 *requires* a live project, so this is free. It closes three open `TODO.md` items and the `CURRENT_STATE.md` §15 unverified-database caveats. `0004` is a hard prerequisite: without it, cloud grading fails on every attempt by design. | Phase 4 |
| **D13** | **Does mobile ship before authoring parity?** | (a) yes, authoring web-first; (b) no, wait for full parity | **Defer this decision to Phase 8**, once Review parity is real and there is evidence about how much authoring actually happens on a phone. If (a), record it as an explicit `platform-parity.md` row, never as drift. | Phase 8 |
| **D14** | **Realtime cross-device updates** | (a) invalidation + `AppState` focus refetch; (b) Supabase Realtime subscriptions | **(a)** for the first version. Realtime adds a second consistency model before the first is proven. Revisit after Phase 8. | Phase 5 |
| **D15** | **Roadmaps on mobile** | (a) web-only by decision; (b) port later | **(a).** `features.md` already places it out of scope and it receives no new development. Record it in `platform-parity.md` so its absence is never mistaken for a gap. | Phase 5 (when the doc is created) |

**Open risks that are not decisions (monitor, do not pre-solve):**
- Hermes `Intl` output differences for `weekday: 'narrow'` / `month: 'short'` (verify Phase 3).
- `ts-fsrs` numeric behaviour on Hermes (assert byte-identical output in Phase 4).
- Metro `exports` resolution changes across Expo SDK upgrades.
- The unidentified single-run test flake (`CURRENT_STATE.md` §16) — capture **complete** output when it next appears.
- Supabase project **Max rows** at real data size, and `count: 'exact'` behaviour under RLS on every paged request (`TODO.md` records exactly what to check).

---

## 23. Immediate next action

**Execute Phase 1, Step 1.0 + Step 1.1 as one milestone: stand up the npm workspace and move `src/types/` into `packages/core`.**

Concretely:
1. Add `"workspaces": ["packages/*"]` to the root `package.json`.
2. Create `packages/core` with `package.json` (`"name": "@itera/core"`, `"main": "src/index.ts"`, `react` as a peer dependency, no build script) and a `vitest.config.ts` with `environment: 'node'`.
3. Add `tsconfig.base.json` carrying the current strict flags plus a `@itera/core` path mapping; have `tsconfig.app.json` extend it.
4. `git mv src/types/* packages/core/src/types/` and export them from `packages/core/src/index.ts`.
5. Leave a one-file `src/types/index.ts` in web that re-exports from `@itera/core`, so **not a single existing web import changes**.
6. Run the gate: `npx vitest run` (825, unchanged), `npx tsc -b --force`, `npm run lint`, `npm run build`, then `npm run dev` and load Today, a deck, a review session and Progress.

**Why this first, and why it is exactly the right size:** it is the smallest change that proves all four resolution paths at once — TypeScript's, Vite's, Vitest's and (later) Metro's — across a workspace boundary, using source TypeScript with no build step. If any of them cannot resolve `@itera/core`, that is discovered in a commit that moved zero logic and can be reverted in one command. Every later step in Phase 1 is a larger move that assumes this works.

**Do not, in that milestone:** move `domain/`, touch the hooks, scaffold anything Expo, or move the web app into `apps/web`.
