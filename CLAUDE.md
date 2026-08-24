# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

Codex reads [`AGENTS.md`](AGENTS.md), which points at the **same** shared documents as this file. Product, design and architecture decisions live in `docs/` and are never duplicated into an agent instruction file — if this file and a doc disagree, the doc wins and this file should be fixed.

## Read first

| Question | Document |
|---|---|
| **Where does the project stand right now?** | [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — current milestone, page-by-page real vs. placeholder, routes, known problems, tests/build baseline, the recommended next milestone. **Read before planning any change.** |
| How is the system structured / where is X? | [`docs/architecture.md`](docs/architecture.md) |
| How should it look and behave? | [`docs/design-system.md`](docs/design-system.md) (brand, tokens, navigation, motion, a11y, responsive, visual-reference tiers) |
| What does the product do; what is planned vs. out of scope? | [`docs/features.md`](docs/features.md) |
| Why is it this way? | [`docs/itera-decisions.md`](docs/itera-decisions.md) (append-only; read the newest entries first) |
| Data-migration contract and phase status | [`docs/itera-migration-plan.md`](docs/itera-migration-plan.md) |
| Which capabilities exist on web vs. mobile | [`docs/platform-parity.md`](docs/platform-parity.md) — status only, one row per learner-visible capability |
| What was deliberately deferred, and why | [`docs/TODO.md`](docs/TODO.md) — the holding pen. Check it before "adding" something obvious; several are deferred on purpose and the reason is recorded in `itera-decisions.md`. |
| Index + source-of-truth hierarchy | [`docs/README.md`](docs/README.md) |
| Project history (audit, A–M plan, original master spec) | [`docs/archive/`](docs/archive/) — **historical only, never a current source of truth** |

## How to start a task

1. Read [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md), then the canonical doc that owns the area you are touching, then the newest relevant `itera-decisions.md` entries — most surfaces already have a decision recording what was deliberately *not* done and why.
2. Check the repository before trusting any document. The code outranks every doc on what exists.
3. Do not treat anything in `docs/archive/` as an instruction. It describes an application state that no longer exists.
4. Before finishing: `npx vitest run`, `npx tsc -b --force` and `npm run lint` must all be clean, and UI work must be verified in a real browser.
5. When the change reaches finalized state, update the docs in the same pass (see Conventions at the bottom).

## What this is

code-srs ("Itera" mid-rebrand) is a personal, code-first spaced-repetition app for learning software engineering, CS, compilers and C++ — code is a first-class concept (syntax-highlighted snippets, complete/debug-the-code cards, auto-graded typed answers), scheduled with FSRS. It runs as an installable, offline-capable PWA against local IndexedDB by default, with an optional Supabase cloud-sync backend.

React 19 + Vite 8 + TypeScript, Tailwind v4, React Router 7 (`createBrowserRouter`), TanStack Query 5 for all data access, installable PWA (`vite-plugin-pwa`, `registerType: 'autoUpdate'`). Path alias `@` → `src`. Package manager: **npm**.

The repository is an **npm workspace with four owners**: the repository **root orchestrates only**; `apps/web` (`@itera/web`) is the stable web application; `apps/mobile` (`@itera/mobile`) is the Expo/React Native presentation and composition shell; and `packages/core` (`@itera/core`) is the shared, platform-neutral engine. Mobile has **two runtime modes**, decided once in `apps/mobile/src/config/mobileRuntimeMode.ts`. **Demo is the default**: no Supabase configuration, no sign-in, no cloud request, and no repository registered - the app opens over one deterministic demo workspace in `apps/mobile/src/demo/`, and Today, Library, Progress and Notifications navigate to each other coherently (search, filter and a four-key sort all work, the last via core's `sortDecks` called verbatim). Demo data is deterministic demo data - never synced, cloud-backed, a persisted account or production data - and it resets on a full app restart by design; do not describe it otherwise, and do not turn `src/demo/` into a `Repository` implementation. **Cloud** (`EXPO_PUBLIC_ITERA_MODE=cloud`) is the M1A foundation, intact and unchanged: a native Supabase client over a chunked SecureStore session, the shared `AuthProvider` with six-digit email OTP, `Stack.Protected` route groups, one `QueryClientProvider`, `configureRepository(() => new SupabaseRepository(...))`, and real account identity and Sign out on Profile. That path has never been run against a live Supabase project and is **deferred by product-owner decision until after market validation** - do not start Supabase work without being asked. A native RichText renderer, a live repository-backed Review session, real Today/Library/Progress data, import/export, authoring and push registration are not connected yet. Core owns shared semantics and keeps `react` and `@tanstack/react-query` as peers; both applications supply the one deduplicated compatible runtime. See [`docs/architecture.md`](docs/architecture.md) "Workspace layout" for the full ownership boundary.

## Commands

All of these run **from the repository root** and are unchanged by the `apps/web` move; the first three delegate to the web workspace.

```bash
npm run dev             # -> @itera/web: Vite dev server (default http://localhost:5173)
npm run dev:mobile      # -> @itera/mobile: Expo/Metro + physical-device QR
npm run build           # -> @itera/web: tsc -b (typecheck, all 4 projects) then vite build -> apps/web/dist/
npm run preview         # -> @itera/web: serve the production build locally
npm run lint            # oxlint over the whole tree (config in .oxlintrc.json)
npm run test            # vitest run (single pass, both projects)
npm run test:watch      # vitest watch mode
npm run dev   --workspace @itera/web    # the same thing, addressed directly
npm run build --workspace @itera/web
npx vitest run packages/core/src/domain/grading/matching.test.ts                      # one test file
npx vitest run -t "autoGrade"                                           # tests matching a name
npx tsc -b --force      # the real typecheck (see the warning below)
npx playwright install chromium                                         # once, before browser verification
```

`npx vitest run`, `npx tsc -b --force` and `npm run lint` must all be clean before a change is done (current baseline: `docs/CURRENT_STATE.md` §16).

**Do not use `npx tsc --noEmit` as the typecheck gate — it checks nothing here.** `tsconfig.json` is solution-style (`"files": []` + `references`), so that command is trivially "clean" and proves nothing. Use `npx tsc -b --force` (or `npm run build`). Also: `apps/web/tsconfig.app.json` excludes `*.test.ts(x)`, so **the web app's test files are never typechecked** — a dangling import in a test only fails at Vitest run time. **`packages/core`'s tests are the exception**: `tsconfig.core.test.json` checks them, which is how four `@/domain` tests asserting on functions deleted with the v1 card model were found (they passed only because `.toThrow()` catches a `ReferenceError`).

Tests are colocated as `*.test.ts`/`*.test.tsx` and split into **two Vitest projects** (`vitest.config.ts`); `npx vitest run` runs both. The **web** project covers `apps/web/src/**` with `environment: 'node'` (no DOM, fast), the `@` alias, blanked `VITE_SUPABASE_*` env vars, and `apps/web/src/test/setup.ts`, which loads `fake-indexeddb` and calls `configureRepository(() => new DexieRepository())` — tests hit the local backend explicitly, not by falling back. The **core** project covers `packages/core/src/**` with **no setup file at all**: no fake IndexedDB, no alias, no env, no configured repository, so core is never proven under a web-specific bootstrap. Do not add a setup file to the core project to make a test pass; a core test that needs one is telling you something about the code it covers. `globals` is **not** enabled — every test file imports `describe`/`it`/`expect` explicitly from `vitest`.

**Component tests** need a DOM: opt in per-file with a `// @vitest-environment happy-dom` pragma as the file's first line (see `apps/web/src/features/reviewV2/ReviewSessionScreen.test.tsx`), rather than changing the global config. Because `globals` isn't enabled, RTL's automatic `afterEach` cleanup never registers — any component test file must add its own `afterEach(() => cleanup())` or renders accumulate across `it` blocks (a real failure mode; `docs/itera-decisions.md` D24). `happy-dom` has no visibility semantics, so **component tests cannot catch focus/layout bugs** (D132) — those need a browser.

## Architecture invariants

Terse rules only. The mechanisms behind them — the seam, both registries, the hooks table, routing, scheduling, migration machinery — are in [`docs/architecture.md`](docs/architecture.md); do not re-derive them here.

- **One shared package.** `packages/core` (`@itera/core`) is consumed as TypeScript **source** - no build step, no `dist/`, no watch process - and resolves through the npm workspace symlink, so it needs **no** Vite alias, no Vitest alias and no `tsconfig` `paths` entry. `tsconfig.core.json` compiles it with **no DOM and no Node ambient types**, so a `window.`/`document.`/`process.` reference there fails `npx tsc -b --force`. Do not move browser-specific code into it, and do not give it an `exports` map or a second entry point - the one deep import that exists (`backendParity.test.ts` reaching `@itera/core/src/data/supabase/fakeSupabaseClient`) is a deliberate, test-only exception, and production code must never copy it. Its tests are typechecked too, by `tsconfig.core.test.json`, which adds `types: ["node"]` and still no DOM - never relax `tsconfig.core.json` instead. `packages/core/src/platformNeutrality.test.ts` reads core's own sources and fails on a browser token, an import from `@/`, or an import of a package core's manifest does not declare.
- **`apps/web/src/types/*`, `apps/web/src/domain/*`, `apps/web/src/lib/{id,shuffle}.ts`, `apps/web/src/data/repository.ts`, `apps/web/src/data/index.ts` and `apps/web/src/hooks/*` are transitional shims, not definition sites.** They define nothing and must never redefine a contract or re-implement logic; `apps/web/src/types/coreSurface.test.ts` enforces that at runtime by reference equality. New code imports from `@itera/core`.
- **One storage seam, and one registry.** Everything depends on `Repository` (`packages/core/src/data/repository.ts`). `configureRepository(factory)` / `getRepository()` live in `packages/core/src/data/registry.ts`; **core has no default backend and throws if never configured**. The web app's only composition point is `apps/web/src/main.tsx`, before `createRoot` - the only place that reads configuration and builds a Supabase client, since the shared backend takes a ready client and never touches `import.meta`. Web tests configure Dexie in `apps/web/src/test/setup.ts`. **Never import a backend from a component, hook or page.**
- **Never resolve the repository at module scope.** `const repo = getRepository()` at the top of a module is forbidden: it makes importing that module construct a backend, which is exactly what stopped the hooks being shareable. Call `getRepository()` **inside** each `queryFn`/`mutationFn`. Two tests enforce it (`packages/core/src/hooks/moduleScope.test.ts`, `apps/web/src/hooks/repositoryResolution.test.tsx`).
- **All data access goes through the shared hooks in `packages/core/src/hooks/`** (`@/hooks/*` re-exports them), with keys centralized in `queryKeys.ts`'s `qk`.
- **One card model.** `packages/core/src/types/card.ts`, imported as `@itera/core` — a single `Card` (content + its own embedded `scheduling`) with six `CardInteraction` members. The v1 8-type union, `CardV2`/`CardV2Record`, `migrateCard` and the `cardStates` store were all deleted when the two models converged. **There is no second card type and no on-read migration.**
- **New card types are new interactions** — add a `CardInteraction` member and follow the checklist in `docs/architecture.md`, which the compiler enforces.
- **One interaction behavior, in `packages/core/src/interactions/`; Views are platform-specific.** `InteractionBehavior<T>` carries `type`, `interactive`, `isResponseReady`, `autoGrade` and the semantic `widthFor` (`'default' | 'wide'` - the intent, never a width); the six descriptors live beside it. Each platform binds them to its own View - web's `WebInteractionDefinition` is `{ ...<type>Behavior, View }` and every `interactions/<type>/index.ts` is that one line. **Never reimplement grading, readiness or semantic width per platform**; `registry.test.ts` asserts the binding by reference. The `max-w-2xl`/`max-w-4xl` mapping stays in `ReviewSessionScreen`. `InteractionViewProps` and `ReviewPhase` stay web-side on purpose.
- **A missing interaction registration throws at runtime, deliberately.** `interactions/registry.ts` is `Partial<...>`, not a total `Record`, so a future seventh type fails loudly instead of rendering nothing. There is one registry per platform and none in core. Do not "improve" this into a compile-time guarantee.
- **One streak definition.** `computeStreak` (`packages/core/src/domain/stats/streak.ts`) serves Today, `StreakBadge` and Progress. Do not add a second streak calculation; surfaces may present it differently.
- **One calendar-day definition.** Local days come from `packages/core/src/domain/stats/calendarDay.ts` (`localDayIndex`, `startOfDay`, `addCalendarDays`, `calendarDaysBetween`, `isNextCalendarDay`, `eachCalendarDay`). **Never step or compare calendar days by adding 86,400,000 ms** — a local day is 23 or 25 hours on the two DST transition days, which is what broke streaks, pace, the heat map and "Yesterday" (audit P1-2). Elapsed time (FSRS intervals, durations, "in 4 hours") stays in milliseconds; the two are different concepts.
- **Scheduling lives on `Card.scheduling`**, embedded in the card. If it is ever extracted into its own entity, that is a deliberate schema change with a migration, not a refactor.
- **Review is generic.** `ReviewSessionScreen` contains no per-type logic, and the flow is strictly two-phase (Question → reveal → Answer → one FSRS grade).
- **One auth policy, in `packages/core/src/auth/`.** `resolveAuthState()` is the mode rule (audit P1-3: the active backend decides which session is a session), `createAuthEngine()` is the lifecycle, and `AuthProvider`/`useAuth` are the one React binding. Core reads no storage, no environment and no route - the platform injects an `AuthConfig`. **Do not add a second implementation of the mode decision on either platform.**
- **`apps/web/src/main.tsx` is the only production module that reads `isSupabaseConfigured`.** It resolves it once into `cloudEnabled` and configures the repository *and* auth from that one value, so backend mode and auth mode cannot disagree. Product code asks `useAuth().mode`, never the environment.
- **Auth storage lives in one file.** `RequireAuth` is one pathless layout route wrapping every product route; `apps/web/src/auth/localSession.ts` (core's `LocalSessionStore` over `localStorage`/`sessionStorage`) is the **only** web file that may touch auth storage — do not add a `localStorage` session check anywhere else. `apps/web/src/auth/storageIsolation.test.ts` enforces it. `RequireAuth`, `AuthGate` and the Login screen stay web-specific: web and native are meant to differ in sign-in interaction, not in session semantics.
- **One text syntax, in `packages/core/src/content/`; renderers are platform-specific.** `parseRichText`/`parseRichInline` decide what `**bold**`, `*italic*`, `` `code` `` and a fenced block mean, and return a closed union of semantic nodes carrying only plain strings. `apps/web/src/components/text/RichText.tsx` is the **web renderer** over that tree and parses nothing; a future native renderer maps the same tree. Underscores are never emphasis markers (`snake_case` stays literal), inline code beats emphasis, `**` beats `*` - all three are locked by `parseRichText.test.ts`. `stripInlineMarkers` (same directory) is the one accessible-name flattening.
- **Card content is data, never markup, and is never sanitized.** No production module in `apps/web/src/` may turn a string into markup or code - `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `eval(`, `new Function(` - and `apps/web/src/components/text/renderingSinks.test.ts` fails the build if one appears. Because rendering is safe, imported and authored text is preserved **byte for byte**: `<`, `>`, `&`, `Vec<T>`, templates and HTML examples are legitimate flashcard content. Do not add a sanitizer, and do not strip characters.
- **`WalkthroughInteraction.image` is the one URL sink, and `isSafeImageSource` gates it at three layers** (the file picker, backup validation, the Review renderer): base64 `data:` URLs of type PNG/JPEG/GIF/WebP/AVIF only. SVG and every remote scheme are refused, because an imported backup pointing at a remote host turns opening a card into a network callback. The image bytes themselves are never decoded or re-encoded.
- **Brand tokens exist twice and may not drift.** `apps/web/src/index.css` paints the browser; `packages/core/src/design/tokens.ts` carries the same palette/radii/font roles as values for a platform with no CSS. Nothing is generated - `apps/web/src/design/tokenDrift.test.ts` asserts they agree in both directions. Do not put layout mechanics (widths, breakpoints, nav heights) in that module, and do not tokenize the type/spacing scale.
- **Do not add a dependency for what this repo builds by hand:** markdown (the shared parser in `packages/core/src/content/` plus `RichText.tsx`, an XSS-safe subset where underscores are deliberately not emphasis markers), charts (hand-rolled SVG/CSS), the roadmap canvas, popovers (`FloatingPanel.tsx`), dialogs (`useDialogs()`, never `window.confirm`/`prompt`/`alert`). CodeMirror 6 stays lazy-loaded via `LazyCodeView`/`LazyCodeEditor`.

## Gotchas

- **Supabase requires table GRANTs, not just RLS.** Postgres denies a table before RLS runs, so a missing grant yields a **403 on every request** (RLS-without-grant = 403; RLS-without-policy = empty 200). When adding a table, add the table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`, and have the user run that block in the Supabase SQL editor (`supabase/schema.sql` is not auto-applied).
- **A successful PostgREST response is not a complete read.** Supabase caps every response at the project's API *Max rows* setting and reports it only in a header, so a `select` that matches more rows comes back short with a 200 and no error. Every Supabase collection read goes through `selectAll` in `packages/core/src/data/supabase/SupabaseRepository.ts`, which pages via `.range()` under a deterministic order ending in `id`. Never terminate such a loop on "a page shorter than requested" (a project whose cap is below the page size answers *every* request short), and never add a page/offset/cursor to the `Repository` interface.
- **Dexie schema changes need a `version()` bump** in `apps/web/src/data/dexie/db.ts` (declare only the new/changed stores; existing ones carry forward).
- **Stale chunk after deploy:** hashed lazy chunks (CodeMirror) 404 on old tabs after a redeploy. `apps/web/src/lib/lazyWithRetry.ts` (`importWithReload`) and `apps/web/src/app/RouteError.tsx` reload once to recover; keep lazy `import()`s wrapped.
- The Supabase **publishable** key (`sb_publishable_…`) is the value for `VITE_SUPABASE_ANON_KEY`; the secret key must never reach the frontend.
- **A CSS `transition` on `transform` doesn't reliably animate when that transform is composed from Tailwind utility classes** (`scale-*`, `rotate-*`, `translate-*`, including `group-hover:` variants) — those utilities each write a separate CSS custom property that a shared rule combines, and transitioning that composed value was measured snapping instantly in Chromium despite a correct `transition-duration`. Compute such transforms as one literal `style.transform` string in JS (see `SuggestedSessionHero.tsx`).
- **Anything portaled into `document.body` sits outside `.itera-scope`** and must re-apply the `itera-scope` class on its own root plus cancel that class's canvas background with an inline `background: transparent`, or its `itera-*` tokens resolve to nothing.
- **The app is light-only, and declares it** — `.itera-scope` has no dark palette, `apps/web/index.html` and `getInitialTheme()` both say light, and the dark token block, the `dark` variant and `ThemeToggle.tsx` are deleted. Keep `ThemeProvider`/`useTheme` and `Theme`'s `'dark'` member (CodeView/CodeEditor pick their syntax palette from it), and don't add dark styling before a dark palette exists.

## Safety and approval boundaries

Ask before doing any of these; none of them is implied by an ordinary feature request.

- **Never delete or rewrite persisted rows as a side effect of a UI change.** Migrations that touch real user data are explicit, dry-run-able and reportable via `packages/core/src/domain/migration/runner.ts`. **No migration may run lazily on read** — the one that used to (`migrateCard`) is gone with the card-model convergence.
- **Do not start a not-started migration** (the Collection/Deck split) incidentally. See [`docs/itera-migration-plan.md`](docs/itera-migration-plan.md).
- **Do not delete the code still kept on purpose** — all Roadmaps routes/data, and `packages/core/src/hooks/useDrafts.ts` + `repo.drafts` + the Dexie drafts store + drafts in backup (the drafts UI was deleted on 2026-08-17, the data deliberately was not). Each is listed in `docs/CURRENT_STATE.md` §15/§18 with the reason. The v1 legacy surface that used to be on this list is gone — do not resurrect it.
- **Do not add a dependency** for anything in the hand-built list above without asking.
- **`docs/itera-decisions.md` is append-only** and `docs/archive/*` is history — never edit either in place to make it agree with new work.
- Schema changes need the user to run SQL in the Supabase editor (`supabase/schema.sql` is not auto-applied), so hand them the exact block.

## Files with hard constraints stated in the file itself

Read the module comment before editing these; each encodes measured product feedback or an invariant that is not obvious from the code:

- `apps/web/src/features/today/SuggestedSessionHero.tsx` — pixel-tuned 4-layer stacked card. Change offsets/rotations/colors only when asked.
- `apps/web/src/features/today/TodayPage.tsx` — real CSS Grid with named `grid-template-areas` + a `matchMedia` breakpoint, both necessarily inline `style`. Also the route's **only** fetcher: the four panels take computed props, and every Today calculation lives in `packages/core/src/domain/stats/`.
- `apps/web/src/features/review/useSessionQueue.ts` — the review queue is a per-mount snapshot, and `ReviewSessionV2` must stay keyed on its `id`. Keying on the live queue's length (what it used to do) makes every grade remount the session.
- `apps/web/src/features/login/LearningCardsIllustration.tsx` — a card may never cover the next card's title; the leaning geometry means this must be re-checked in a browser, not in the numbers.
- `apps/web/src/features/reviewV2/interactions/ordering/OrderingRow.tsx` — the up/down buttons stay in the DOM and in tab order at all times (faded with `opacity-0`, never `hidden`).
- `apps/web/src/components/layout/AccountMenuContent.tsx` — quick navigation only; new settings go to `apps/web/src/features/settings/`.
- `apps/web/src/features/design-preview/*` — only the six review-interaction previews remain, and they import the **production** `ReviewSessionScreen` so they cannot drift. The Library preview fork was deleted once production overtook it; don't recreate a fork here.

## Visual work

The project is mockup-driven and several mockups are **locked references**; they live outside the repo at `C:\Users\SK\Desktop\itera-mockups\` (`webapp/` holds the product mockups cited by filename throughout `docs/itera-decisions.md`). [`docs/design-system.md`](docs/design-system.md) §14 defines the LOCKED / DIRECTION / CONCEPT tiers; read it before implementing against any image.

- Treat a locked mockup as the authority for composition, hierarchy, spacing, density and typography. Two standing exceptions, already decided: colors always come from the locked Itera token palette (never a mockup's own hues), and a mockup element with no real backing feature is either omitted or rendered as a focusable `aria-disabled` row with a "Soon" pill — never fabricated, never `disabled`, never hidden.
- Where a written brief and a locked mockup conflict, surface the conflict and ask rather than silently picking one.
- **Run the app and verify visually; tests are not sufficient for UI work.** Drive Chromium via the `playwright` devDependency, check 1440x900 and 390x844, and exercise hover, keyboard focus and graded/revealed states. Focus, popover placement, overflow and animated transforms **must** be browser-checked. Keep throwaway browser scripts in the session scratch directory, not the repo root.
- Orange is a signal, not theme paint: one primary orange action plus at most two or three minor accents per screen. The full rule, plus motion/reduced-motion and accessibility conventions, is in [`docs/design-system.md`](docs/design-system.md).

## Conventions

- **No em dashes in code comments.** Explain non-obvious *why*, not *what*.
- Match the surrounding code: shared input styling via `Field` / `fieldClass` / `selectClass`, buttons via `components/ui/Button`, class merging via `cn` (`apps/web/src/lib/cn.ts`), ids via `newId()` (`@itera/core`).
- oxlint enforces `react-hooks/exhaustive-deps`; when intentionally omitting a dep, use a stable serialized key and an `// eslint-disable-next-line react-hooks/exhaustive-deps` (see `CodeView`, `ReviewSessionScreen`).
- Backup files (`packages/core/src/domain/io/backup.ts`) are versioned; new entity arrays are added **optional** so older backups still import. Imports are validated before any write: entity structure in `packages/core/src/domain/io/validateBackupEntities.ts` (pure, no dependency), and the `card.deckId` referential rule in `packages/core/src/data/backup.ts` (mode-dependent, and it must stay ahead of the replace-mode `clear()`). Backup orchestration takes its `Repository` as an argument; the configured-repository tier is `packages/core/src/hooks/useBackup.ts` (the old `apps/web/src/data/backup.ts` adapter was deleted in the registry move). The envelope's `app: 'code-srs'` is a **legacy format identifier, not the product name** - do not rename it. **Changing `packages/core/src/types/card.ts` or the backup format means updating `docs/prompts/ai-card-prompt.md` in the same pass** - it is a real import contract, and it once drifted into producing files the app refuses.
- `docs/itera-decisions.md` is **append-only**: never edit a past entry's substance in place. If a decision is superseded, add a new dated entry that says so and cross-references the old one — don't rewrite history.
- **When a change reaches finalized state** (a feature is implemented, a design/behavior change is settled — not a WIP/exploratory edit), update documentation in the same pass: `docs/CURRENT_STATE.md` whenever status changes, plus `docs/architecture.md` / `docs/design-system.md` / `docs/features.md` for what they cover, `README.md` for user-facing changes, and `docs/itera-decisions.md` for material decisions (append a new dated entry, never edit one). Don't leave docs describing the pre-change state.
