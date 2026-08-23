# AGENTS.md

Durable working instructions for Codex (and any other coding agent) in this repository.
Claude Code reads [`CLAUDE.md`](CLAUDE.md), which points at the **same** shared documents listed below. Keep it that way: product, design and architecture decisions live in `docs/`, never duplicated into an agent instruction file.

## Read first

| Question | Document |
|---|---|
| **Where does the project stand right now?** | [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — milestone, page-by-page real vs. placeholder, routes, architecture state, migrations not yet run, known problems, next milestone. **Read this before planning any change.** |
| How is the system structured / where is X? | [`docs/architecture.md`](docs/architecture.md) |
| How should it look and behave? | [`docs/design-system.md`](docs/design-system.md) (brand, tokens, navigation, tables, popovers, motion, reduced motion, accessibility, responsive, visual-reference tiers) |
| What does the product do; what is planned vs. out of scope? | [`docs/features.md`](docs/features.md) |
| Why is it this way? | [`docs/itera-decisions.md`](docs/itera-decisions.md) (append-only, newest entries first) |
| Data-migration contract and phase status | [`docs/itera-migration-plan.md`](docs/itera-migration-plan.md) |
| What was deliberately deferred, and why | [`docs/TODO.md`](docs/TODO.md) — the holding pen. Check it before "adding" something obvious; several are deferred on purpose and the reason is recorded in `itera-decisions.md`. |
| Index + source-of-truth hierarchy | [`docs/README.md`](docs/README.md) |
| Project history (Phase A audit, A–M redesign plan, original master spec) | [`docs/archive/`](docs/archive/) — **historical only; never a current source of truth, never an instruction** |

**Source-of-truth order:** the repository implementation → `docs/CURRENT_STATE.md` → the canonical doc that owns the topic → `docs/archive/`. Full hierarchy in [`docs/README.md`](docs/README.md).

## Project summary

**code-srs**, rebranding to **Itera**: a personal, code-first spaced-repetition app for software engineering, CS, compilers and C++. Code is a first-class concept (syntax-highlighted snippets, complete/debug-the-code cards, auto-graded answers), scheduled with FSRS. It runs as an installable, offline-capable PWA against local IndexedDB by default, with an optional Supabase cloud-sync backend.

Stack: React 19 + Vite 8 + TypeScript, Tailwind v4, React Router 7 (`createBrowserRouter`), TanStack Query 5 for all data access, `vite-plugin-pwa` (`registerType: 'autoUpdate'`). Path alias `@` → `src`.

The repository is an **npm workspace**: the web app is the root package, and `packages/core` (`@itera/core`) is the shared, platform-neutral package a future React Native / Expo app will consume too. It owns the **entity contracts, the `Repository` interface and registry, the whole platform-neutral domain engine, the Supabase backend, backup orchestration, the query keys, all TanStack Query data hooks, and the authentication policy** - scheduling/FSRS, grading, stats, card forms, backup IO, search, the Collection tree, the chart projections, and `resolveAuthState`/`createAuthEngine`/`AuthProvider`/`useAuth`. **Dexie, the `VITE_SUPABASE_*` lookup, browser Supabase client construction, the choice of backend, browser session storage, the route guards, the Login UI, and `QueryClient`/`QueryClientProvider` stay in the web app.** `react` and `@tanstack/react-query` are **peer** dependencies of core - never add them as dependencies, that is how a second React or Query context gets installed. The web app keeps thin re-export shims at the old `@/domain/*`, `@/lib/{id,shuffle}`, `@/data/repository`, `@/data` and `@/hooks/*` paths. See [`docs/architecture.md`](docs/architecture.md) "Workspace layout".

## Package manager and commands

**npm** (there is a `package-lock.json`; do not introduce pnpm/yarn/bun).

```bash
npm install             # install dependencies
npm run dev             # Vite dev server, http://localhost:5173
npm run build           # tsc -b (typecheck) then vite build -> dist/
npm run preview         # serve the production build
npm run lint            # oxlint (config in .oxlintrc.json)
npm run test            # vitest run (single pass)
npm run test:watch      # vitest watch
npx tsc -b --force      # the real typecheck; `tsc --noEmit` checks NOTHING here
npx vitest run path/to/file.test.ts     # one test file
npx vitest run -t "autoGrade"           # tests matching a name
npx playwright install chromium         # once, before any browser verification
```

Before calling a change done: `npx vitest run`, `npx tsc -b --force`, and `npm run lint` must all be clean (current baseline in `docs/CURRENT_STATE.md` §16).

**`npx tsc --noEmit` is a no-op in this repo** — `tsconfig.json` is solution-style (`"files": []` + `references`), so it checks zero files. Use `npx tsc -b --force`. The web app's test files are excluded from typechecking entirely, so a dangling import there surfaces only at Vitest run time. `packages/core`'s tests are the exception — `tsconfig.core.test.json` checks them.

### Test conventions

Colocated `*.test.ts(x)`, split into **two Vitest projects** (`vitest.config.ts`); `npx vitest run` runs both. **web** covers `src/**` with `environment: 'node'`, the `@` alias, blanked `VITE_SUPABASE_*`, and `src/test/setup.ts` (fake-indexeddb + an explicit `configureRepository(() => new DexieRepository())`). **core** covers `packages/core/src/**` with **no setup file**: no fake IndexedDB, no alias, no env, no configured repository, so core is never proven under a web bootstrap. Do not add a setup file to the core project to make a test pass. `globals` is **not** enabled — import `describe`/`it`/`expect` from `vitest` in every file.

Component tests opt into a DOM per file with `// @vitest-environment happy-dom` as the **first line**, and must add their own `afterEach(() => cleanup())` — without `globals`, RTL's automatic cleanup never registers and renders accumulate across `it` blocks. Do not change the global environment.

`happy-dom` has no visibility semantics, so **component tests cannot catch focus or layout bugs**; those need a real browser.

## Architecture constraints

- **One shared package.** `packages/core` (`@itera/core`) is consumed as TypeScript **source** - no build step, no `dist/`, no watch process - and resolves through the npm workspace symlink, so it needs **no** Vite alias, no Vitest alias and no `tsconfig` `paths` entry. `tsconfig.core.json` compiles it with **no DOM and no Node ambient types**, so a `window.`/`document.`/`process.` reference there fails `npx tsc -b --force`. Do not move browser-specific code into it, and do not give it an `exports` map or a second entry point - the one deep import that exists (`backendParity.test.ts` reaching `@itera/core/src/data/supabase/fakeSupabaseClient`) is a deliberate, test-only exception, and production code must never copy it. Its tests are typechecked too, by `tsconfig.core.test.json`, which adds `types: ["node"]` and still no DOM - never relax `tsconfig.core.json` instead. `packages/core/src/platformNeutrality.test.ts` reads core's own sources and fails on a browser token, an import from `@/`, or an import of a package core's manifest does not declare.
- **`src/types/*`, `src/domain/*`, `src/lib/{id,shuffle}.ts`, `src/data/repository.ts`, `src/data/index.ts` and `src/hooks/*` are transitional shims, not definition sites.** They define nothing and must never redefine a contract or re-implement logic; `src/types/coreSurface.test.ts` enforces that at runtime by reference equality. New code imports from `@itera/core`.
- **One storage seam, and one registry.** Everything depends on `Repository` (`packages/core/src/data/repository.ts`). `configureRepository(factory)` / `getRepository()` live in `packages/core/src/data/registry.ts`; **core has no default backend and throws if never configured**. The web app's only composition point is `src/main.tsx`, before `createRoot` - the only place that reads configuration and builds a Supabase client, since the shared backend takes a ready client and never touches `import.meta`. Web tests configure Dexie in `src/test/setup.ts`. **Never import a backend from a component, hook or page.**
- **Never resolve the repository at module scope.** `const repo = getRepository()` at the top of a module is forbidden: it makes importing that module construct a backend, which is exactly what stopped the hooks being shareable. Call `getRepository()` **inside** each `queryFn`/`mutationFn`. Two tests enforce it (`packages/core/src/hooks/moduleScope.test.ts`, `src/hooks/repositoryResolution.test.tsx`).
- **All data access goes through the shared TanStack Query hooks in `packages/core/src/hooks/`** (`@/hooks/*` re-exports them), with keys centralized in `queryKeys.ts`'s `qk`. Each application owns its own `QueryClient`/`QueryClientProvider`; core owns keys, queries and invalidation.
- **One auth policy, in `packages/core/src/auth/`.** `resolveAuthState()` is the mode rule (audit P1-3: the active backend decides which session is a session), `createAuthEngine()` is the lifecycle, and `AuthProvider`/`useAuth` are the one React binding. Core reads no storage, no environment and no route - the platform injects an `AuthConfig`. **Do not add a second implementation of the mode decision on either platform.**
- **`src/main.tsx` is the only production module that reads `isSupabaseConfigured`.** It resolves it once into `cloudEnabled` and configures the repository *and* auth from that one value, so backend mode and auth mode cannot disagree. Product code asks `useAuth().mode`, never the environment.
- **Auth storage lives in one file.** `RequireAuth` is one pathless layout route wrapping every product route; `src/auth/localSession.ts` (core's `LocalSessionStore` over `localStorage`/`sessionStorage`) is the **only** web file that may touch auth storage — do not add a `localStorage` session check anywhere else. `src/auth/storageIsolation.test.ts` enforces it. `RequireAuth`, `AuthGate` and the Login screen stay web-specific: web and native are meant to differ in sign-in interaction, not in session semantics.
- **Entities are opaque JSON blobs** keyed by an inline `id`; Supabase's few generated columns exist only for indexing, and all text/tag/type filtering happens **in memory identically in both backends**. Adding a field to a type needs no migration.
- **One card model.** `packages/core/src/types/card.ts`, imported as `@itera/core` — a single `Card` (content + embedded `scheduling`) with six `CardInteraction` members, registry in `src/features/reviewV2/interactions/registry.ts`. The v1 union, `CardV2`/`CardV2Record` and `migrateCard` were deleted when the models converged.
- **New card types are new interactions**; see `docs/architecture.md`.
- **One interaction behavior, in `packages/core/src/interactions/`; Views are platform-specific.** `InteractionBehavior<T>` carries `type`, `interactive`, `isResponseReady`, `autoGrade` and the semantic `widthFor` (`'default' | 'wide'` - the intent, never a width); the six descriptors live beside it. Each platform binds them to its own View - web's `WebInteractionDefinition` is `{ ...<type>Behavior, View }` and every `interactions/<type>/index.ts` is that one line. **Never reimplement grading, readiness or semantic width per platform**; `registry.test.ts` asserts the binding by reference. The `max-w-2xl`/`max-w-4xl` mapping stays in `ReviewSessionScreen`. `InteractionViewProps` and `ReviewPhase` stay web-side on purpose.
- **A missing interaction registration throws at runtime, deliberately.** `interactions/registry.ts` is `Partial<...>`, not a total `Record`, so a future seventh type fails loudly instead of rendering nothing. There is one registry per platform and none in core. Do not "improve" this into a compile-time guarantee.
- **One streak definition.** `computeStreak` (`packages/core/src/domain/stats/streak.ts`) serves Today, the top-nav `StreakBadge` and Progress. Do not add a second streak calculation; surfaces may present it differently.
- **One calendar-day definition.** Local days come from `packages/core/src/domain/stats/calendarDay.ts` (`localDayIndex`, `startOfDay`, `addCalendarDays`, `calendarDaysBetween`, `isNextCalendarDay`, `eachCalendarDay`). **Never step or compare calendar days by adding 86,400,000 ms** — a local day is 23 or 25 hours on the two DST transition days, which is what broke streaks, pace, the heat map and "Yesterday" (audit P1-2). Elapsed time (FSRS intervals, durations, "in 4 hours") stays in milliseconds; the two are different concepts.
- **Today computes nothing in a component.** `TodayPage` is the route's only fetcher; the four panels take computed props, and every Today calculation is a pure function in `packages/core/src/domain/stats/` (`todayMetrics`, `streak`, `deckMetrics`, `progressMetrics`).
- **A review session's queue is a snapshot.** `src/features/review/useSessionQueue.ts` freezes it per mount and `ReviewSessionV2` is keyed on the snapshot `id`. Keying on the live due query's length (what it used to do) makes every grade remount the session. `/review` takes `?deck=<id>` (subtree scope) and `?limit=<n>`, neither persisted.
- **Adding an entity** means: a `CrudRepo<T>` line in *both* backends + a Dexie `version()` bump + a Supabase table block + a hook + `queryKeys` + inclusion in the backup.
- **One text syntax, in `packages/core/src/content/`; renderers are platform-specific.** `parseRichText`/`parseRichInline` decide what `**bold**`, `*italic*`, `` `code` `` and a fenced block mean, and return a closed union of semantic nodes carrying only plain strings. `src/components/text/RichText.tsx` is the **web renderer** over that tree and parses nothing; a future native renderer maps the same tree. Underscores are never emphasis markers (`snake_case` stays literal), inline code beats emphasis, `**` beats `*` - all three are locked by `parseRichText.test.ts`. `stripInlineMarkers` (same directory) is the one accessible-name flattening.
- **Card content is data, never markup, and is never sanitized.** No production module in `src/` may turn a string into markup or code - `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `eval(`, `new Function(` - and `src/components/text/renderingSinks.test.ts` fails the build if one appears. Because rendering is safe, imported and authored text is preserved **byte for byte**: `<`, `>`, `&`, `Vec<T>`, templates and HTML examples are legitimate flashcard content. Do not add a sanitizer, and do not strip characters.
- **`WalkthroughInteraction.image` is the one URL sink, and `isSafeImageSource` gates it at three layers** (the file picker, backup validation, the Review renderer): base64 `data:` URLs of type PNG/JPEG/GIF/WebP/AVIF only. SVG and every remote scheme are refused, because an imported backup pointing at a remote host turns opening a card into a network callback. The image bytes themselves are never decoded or re-encoded.
- **Brand tokens exist twice and may not drift.** `src/index.css` paints the browser; `packages/core/src/design/tokens.ts` carries the same palette/radii/font roles as values for a platform with no CSS. Nothing is generated - `src/design/tokenDrift.test.ts` asserts they agree in both directions. Do not put layout mechanics (widths, breakpoints, nav heights) in that module, and do not tokenize the type/spacing scale.
- **No new dependencies for things this repo builds by hand**: no markdown library (the shared parser in `packages/core/src/content/` plus `src/components/text/RichText.tsx` are a deliberate XSS-safe subset), no charting library (charts are hand-rolled SVG/CSS), no graph library (roadmap canvas is hand-built SVG), no popover library (`src/components/ui/FloatingPanel.tsx`). CodeMirror must stay lazy-loaded via `LazyCodeView`/`LazyCodeEditor`.
- **The app is light-only and says so** — `.itera-scope` has no dark palette; `index.html`, `getInitialTheme()` both say light, and the dark token block plus `ThemeToggle.tsx` are deleted. Keep `ThemeProvider`/`useTheme` (CodeView/CodeEditor read `Theme` for their syntax palette); do not add dark-mode styling without a dark palette existing first.

## Data-safety constraints

- **Dexie schema changes require a `version()` bump** in `src/data/dexie/db.ts` (declare only new/changed stores; existing ones carry forward).
- **Supabase tables need GRANTs, not just RLS.** Postgres denies before RLS runs: RLS-without-grant = **403 on every request**, RLS-without-policy = empty 200. Every table needs table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`. `supabase/schema.sql` is **not** auto-applied — the user runs it in the Supabase SQL editor, so hand them the exact block.
- **A successful PostgREST response is not a complete read.** Supabase caps every response at the project's API *Max rows* setting and reports it only in a header, so a `select` that matches more rows comes back short with a 200 and no error. Every Supabase collection read goes through `selectAll` in `packages/core/src/data/supabase/SupabaseRepository.ts`, which pages via `.range()` under a deterministic order ending in `id`. Never terminate such a loop on "a page shorter than requested" (a project whose cap is below the page size answers *every* request short), and never add a page/offset/cursor to the `Repository` interface.
- The **publishable** key (`sb_publishable_…`) is `VITE_SUPABASE_ANON_KEY`. The secret key must never reach the frontend.
- **`Card.scheduling` is the sole source of truth for scheduling**, embedded in the card itself. The half-built `CardState` extraction (a write-only `cardStates` store nothing read) was removed with the card-model convergence; separating content from scheduling again would be a deliberate schema change with its own migration.
- **Backup files are versioned** (`packages/core/src/domain/io/backup.ts`); new entity arrays are added **optional** so older backups still import. Imports are validated before any write: entity structure in `packages/core/src/domain/io/validateBackupEntities.ts`, and the `card.deckId` referential rule in `packages/core/src/data/backup.ts` (mode-dependent; it must run before the replace-mode `clear()`). Backup orchestration takes its `Repository` as an argument; the configured-repository tier is `packages/core/src/hooks/useBackup.ts` (the old `src/data/backup.ts` adapter was deleted in the registry move). `app: 'code-srs'` is a legacy format identifier, not the product name - do not rename it. **Changing the card type or the backup format means updating `docs/prompts/ai-card-prompt.md` in the same pass.**
- **Migrations that touch real user data are explicit, dry-run-able and reportable** via `packages/core/src/domain/migration/runner.ts`'s `MigrationRunner`. **No migration may be lazy/on-read** — the one that was (`migrateCard`) is gone.
- Never delete or rewrite persisted rows as a side effect of a UI change.

## Visual implementation workflow

This project is mockup-driven, and several mockups are **locked references**.

1. **Read `docs/CURRENT_STATE.md` and the relevant `docs/itera-decisions.md` entries** for the surface you are about to touch — most screens already have decisions recording what was deliberately *not* copied from the mockup and why.
2. **When a target screenshot is marked as locked/reference, treat it as the authority for composition, hierarchy, spacing, density and typography.** Do not improvise a different layout. Two standing exceptions, both already decided: (a) colors always come from the locked Itera token palette, never from a mockup's own hues, and (b) a mockup element with no real data or backing feature is not fabricated — it is either omitted or rendered as a focusable `aria-disabled` row with a "Soon" pill (never a `disabled` control, never a hidden one).
3. Where a written brief and a locked mockup conflict, say so explicitly and ask the user which wins rather than silently picking one.
4. **Run the app and verify visually. Tests are not sufficient for UI work.** `npm run dev`, then drive Chromium via the `playwright` devDependency (`npx playwright install chromium` once) — take screenshots at the widths that matter (1440x900 desktop, 390x844 phone), and check hover, keyboard focus, and any graded/revealed state, not just the resting state. Anything involving focus, popover placement, overflow or animated transforms **must** be checked in a browser, because the test environment cannot see it.
5. Put throwaway browser-driving scripts in your session scratch directory, **not** in the repo root.
6. Respect the locked orange rule: orange is a signal — one primary orange action plus at most two or three minor accents per screen. That rule, plus motion/reduced-motion, accessibility and responsive conventions, lives in [`docs/design-system.md`](docs/design-system.md).
7. `SuggestedSessionHero.tsx`'s geometry and `LearningCardsIllustration.tsx`'s card offsets are pixel-tuned from product feedback and carry hard constraints stated in their own files. Change them only when explicitly asked. Other files whose module comment states an invariant that is not obvious from the code: `TodayPage.tsx`, `useSessionQueue.ts`, `OrderingRow.tsx`, `AccountMenuContent.tsx`. Read the comment before editing.

## Visual references

There is deliberately **no `docs/references/` directory** — mockups and inspiration are not tracked in git. They live outside the repository. [`docs/design-system.md`](docs/design-system.md) §14 defines how each reference is treated (**LOCKED** = authoritative composition, **DIRECTION** = feel only, **CONCEPT** = history only); check the citing entry in `docs/itera-decisions.md` before implementing against an image.

```
C:\Users\SK\Desktop\itera-mockups\
    webapp\        # the locked product mockups referenced throughout docs/itera-decisions.md
                   #   login-v3.png, profile.png, profile-menu.png, progress.png,
                   #   library.png, all-decks.png, library-use.png, add-new-card.png,
                   #   recall-card.png, recall-card-revealed.png, mcq-card.png,
                   #   ordering-card.png, matching-card.png, optional-tip.png, ...
    inspo-icons\   # per-interaction icon references
    inspiration\   # general visual direction
    mobile\        # mobile-specific references
```

## Conventions

- **No em dashes in code comments.** Comments explain the non-obvious *why*, not the *what*.
- Match the surrounding code: shared inputs via `Field` / `fieldClass` / `selectClass`, buttons via `components/ui/Button`, class merging via `cn` (`src/lib/cn.ts`), ids via `newId()` (`@itera/core`), confirmations via `useDialogs()` (never `window.confirm`/`prompt`/`alert`).
- oxlint enforces `react-hooks/exhaustive-deps`; when intentionally omitting a dep, use a stable serialized key plus an `// eslint-disable-next-line react-hooks/exhaustive-deps`.
- A CSS `transition` on a Tailwind-**composed** transform (`scale-*`/`rotate-*`/`translate-*`, including `group-hover:` variants) does not animate reliably — compute such transforms as one literal `style.transform` string in JS.
- Keep lazy `import()`s wrapped in `src/lib/lazyWithRetry.ts`'s `importWithReload`, so a stale hashed chunk after a deploy recovers instead of 404ing.
- **`docs/itera-decisions.md` is append-only.** Never edit a past entry's substance; supersede it with a new dated entry that cross-references the old one.
- **When a change reaches finalized state, update docs in the same pass**: `docs/CURRENT_STATE.md` (always, when status changes), plus `docs/architecture.md` / `docs/design-system.md` / `docs/features.md` for what they cover, `README.md` for user-facing changes, and `docs/itera-decisions.md` for material decisions (append a new dated entry, never edit one).
