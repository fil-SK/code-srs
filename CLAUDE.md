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

## Commands

```bash
npm run dev             # Vite dev server (default http://localhost:5173)
npm run build           # tsc -b (typecheck) then vite build -> dist/
npm run preview         # serve the production build locally
npm run lint            # oxlint (config in .oxlintrc.json)
npm run test            # vitest run (single pass)
npm run test:watch      # vitest watch mode
npx vitest run src/domain/grading/matching.test.ts                      # one test file
npx vitest run -t "autoGrade"                                           # tests matching a name
npx tsc -b --force      # the real typecheck (see the warning below)
npx playwright install chromium                                         # once, before browser verification
```

`npx vitest run`, `npx tsc -b --force` and `npm run lint` must all be clean before a change is done (current baseline: `docs/CURRENT_STATE.md` §16).

**Do not use `npx tsc --noEmit` as the typecheck gate — it checks nothing here.** `tsconfig.json` is solution-style (`"files": []` + `references`), so that command is trivially "clean" and proves nothing. Use `npx tsc -b --force` (or `npm run build`). Also: `tsconfig.app.json` excludes `*.test.ts(x)`, so **test files are never typechecked** — a dangling import in a test only fails at Vitest run time.

Tests are colocated as `*.test.ts`/`*.test.tsx`. The suite is **hermetic**: `vitest.config.ts` sets `environment: 'node'` globally (no DOM, fast) and blanks the `VITE_SUPABASE_*` env vars so tests always hit the local Dexie backend (via `fake-indexeddb`), regardless of a developer's `.env.local`. `globals` is **not** enabled — every test file imports `describe`/`it`/`expect` explicitly from `vitest`.

**Component tests** need a DOM: opt in per-file with a `// @vitest-environment happy-dom` pragma as the file's first line (see `src/features/reviewV2/ReviewSessionScreen.test.tsx`), rather than changing the global config. Because `globals` isn't enabled, RTL's automatic `afterEach` cleanup never registers — any component test file must add its own `afterEach(() => cleanup())` or renders accumulate across `it` blocks (a real failure mode; `docs/itera-decisions.md` D24). `happy-dom` has no visibility semantics, so **component tests cannot catch focus/layout bugs** (D132) — those need a browser.

## Architecture invariants

Terse rules only. The mechanisms behind them — the seam, both registries, the hooks table, routing, scheduling, migration machinery — are in [`docs/architecture.md`](docs/architecture.md); do not re-derive them here.

- **One storage seam.** Everything depends on `Repository` (`src/data/repository.ts`); `getRepository()` (`src/data/index.ts`) picks Dexie or Supabase. **Never import a backend from a component, hook or page**, and never bypass the TanStack Query hooks in `src/hooks/` (keys centralized in `queryKeys.ts`).
- **One card model.** `src/types/card.ts` — a single `Card` (content + its own embedded `scheduling`) with six `CardInteraction` members. The v1 8-type union, `CardV2`/`CardV2Record`, `migrateCard` and the `cardStates` store were all deleted when the two models converged. **There is no second card type and no on-read migration.**
- **New card types are new interactions** — add a `CardInteraction` member and follow the checklist in `docs/architecture.md`, which the compiler enforces.
- **Scheduling lives on `Card.scheduling`**, embedded in the card. If it is ever extracted into its own entity, that is a deliberate schema change with a migration, not a refactor.
- **Review is generic.** `ReviewSessionScreen` contains no per-type logic, and the flow is strictly two-phase (Question → reveal → Answer → one FSRS grade).
- **Auth lives in one place.** `RequireAuth` is one pathless layout route wrapping every product route; `localSession.ts` is the **only** file that may touch auth storage — do not add a `localStorage` session check anywhere else.
- **Do not add a dependency for what this repo builds by hand:** markdown (`RichText.tsx`, an XSS-safe subset where underscores are deliberately not emphasis markers), charts (hand-rolled SVG/CSS), the roadmap canvas, popovers (`FloatingPanel.tsx`), dialogs (`useDialogs()`, never `window.confirm`/`prompt`/`alert`). CodeMirror 6 stays lazy-loaded via `LazyCodeView`/`LazyCodeEditor`.

## Gotchas

- **Supabase requires table GRANTs, not just RLS.** Postgres denies a table before RLS runs, so a missing grant yields a **403 on every request** (RLS-without-grant = 403; RLS-without-policy = empty 200). When adding a table, add the table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`, and have the user run that block in the Supabase SQL editor (`supabase/schema.sql` is not auto-applied).
- **Dexie schema changes need a `version()` bump** in `src/data/dexie/db.ts` (declare only the new/changed stores; existing ones carry forward).
- **Stale chunk after deploy:** hashed lazy chunks (CodeMirror) 404 on old tabs after a redeploy. `src/lib/lazyWithRetry.ts` (`importWithReload`) and `src/app/RouteError.tsx` reload once to recover; keep lazy `import()`s wrapped.
- The Supabase **publishable** key (`sb_publishable_…`) is the value for `VITE_SUPABASE_ANON_KEY`; the secret key must never reach the frontend.
- **A CSS `transition` on `transform` doesn't reliably animate when that transform is composed from Tailwind utility classes** (`scale-*`, `rotate-*`, `translate-*`, including `group-hover:` variants) — those utilities each write a separate CSS custom property that a shared rule combines, and transitioning that composed value was measured snapping instantly in Chromium despite a correct `transition-duration`. Compute such transforms as one literal `style.transform` string in JS (see `SuggestedSessionHero.tsx`).
- **Anything portaled into `document.body` sits outside `.itera-scope`** and must re-apply the `itera-scope` class on its own root plus cancel that class's canvas background with an inline `background: transparent`, or its `itera-*` tokens resolve to nothing.
- **The app is light-only, and declares it** — `.itera-scope` has no dark palette, `index.html` and `getInitialTheme()` both say light, and the dark token block, the `dark` variant and `ThemeToggle.tsx` are deleted. Keep `ThemeProvider`/`useTheme` and `Theme`'s `'dark'` member (CodeView/CodeEditor pick their syntax palette from it), and don't add dark styling before a dark palette exists.

## Safety and approval boundaries

Ask before doing any of these; none of them is implied by an ordinary feature request.

- **Never delete or rewrite persisted rows as a side effect of a UI change.** Migrations that touch real user data are explicit, dry-run-able and reportable via `src/domain/migration/runner.ts`. **No migration may run lazily on read** — the one that used to (`migrateCard`) is gone with the card-model convergence.
- **Do not start a not-started migration** (the Collection/Deck split) incidentally. See [`docs/itera-migration-plan.md`](docs/itera-migration-plan.md).
- **Do not delete the code still kept on purpose** — all Roadmaps routes/data, and `src/hooks/useDrafts.ts` + `repo.drafts` + the Dexie drafts store + drafts in backup (the drafts UI was deleted on 2026-08-17, the data deliberately was not). Each is listed in `docs/CURRENT_STATE.md` §15/§18 with the reason. The v1 legacy surface that used to be on this list is gone — do not resurrect it.
- **Do not add a dependency** for anything in the hand-built list above without asking.
- **`docs/itera-decisions.md` is append-only** and `docs/archive/*` is history — never edit either in place to make it agree with new work.
- Schema changes need the user to run SQL in the Supabase editor (`supabase/schema.sql` is not auto-applied), so hand them the exact block.

## Files with hard constraints stated in the file itself

Read the module comment before editing these; each encodes measured product feedback or an invariant that is not obvious from the code:

- `src/features/today/SuggestedSessionHero.tsx` — pixel-tuned 4-layer stacked card. Change offsets/rotations/colors only when asked.
- `src/features/today/TodayPage.tsx` — real CSS Grid with named `grid-template-areas` + a `matchMedia` breakpoint, both necessarily inline `style`.
- `src/features/login/LearningCardsIllustration.tsx` — a card may never cover the next card's title; the leaning geometry means this must be re-checked in a browser, not in the numbers.
- `src/features/reviewV2/interactions/ordering/OrderingRow.tsx` — the up/down buttons stay in the DOM and in tab order at all times (faded with `opacity-0`, never `hidden`).
- `src/components/layout/AccountMenuContent.tsx` — quick navigation only; new settings go to `src/features/settings/`.
- `src/features/design-preview/*` — only the six review-interaction previews remain, and they import the **production** `ReviewSessionScreen` so they cannot drift. The Library preview fork was deleted once production overtook it; don't recreate a fork here.

## Visual work

The project is mockup-driven and several mockups are **locked references**; they live outside the repo at `C:\Users\SK\Desktop\itera-mockups\` (`webapp/` holds the product mockups cited by filename throughout `docs/itera-decisions.md`). [`docs/design-system.md`](docs/design-system.md) §14 defines the LOCKED / DIRECTION / CONCEPT tiers; read it before implementing against any image.

- Treat a locked mockup as the authority for composition, hierarchy, spacing, density and typography. Two standing exceptions, already decided: colors always come from the locked Itera token palette (never a mockup's own hues), and a mockup element with no real backing feature is either omitted or rendered as a focusable `aria-disabled` row with a "Soon" pill — never fabricated, never `disabled`, never hidden.
- Where a written brief and a locked mockup conflict, surface the conflict and ask rather than silently picking one.
- **Run the app and verify visually; tests are not sufficient for UI work.** Drive Chromium via the `playwright` devDependency, check 1440x900 and 390x844, and exercise hover, keyboard focus and graded/revealed states. Focus, popover placement, overflow and animated transforms **must** be browser-checked. Keep throwaway browser scripts in the session scratch directory, not the repo root.
- Orange is a signal, not theme paint: one primary orange action plus at most two or three minor accents per screen. The full rule, plus motion/reduced-motion and accessibility conventions, is in [`docs/design-system.md`](docs/design-system.md).

## Conventions

- **No em dashes in code comments.** Explain non-obvious *why*, not *what*.
- Match the surrounding code: shared input styling via `Field` / `fieldClass` / `selectClass`, buttons via `components/ui/Button`, class merging via `cn` (`src/lib/cn.ts`), ids via `newId()` (`src/lib/id.ts`).
- oxlint enforces `react-hooks/exhaustive-deps`; when intentionally omitting a dep, use a stable serialized key and an `// eslint-disable-next-line react-hooks/exhaustive-deps` (see `CodeView`, `ReviewSession`).
- Backup files (`src/domain/io/backup.ts`) are versioned; new entity arrays are added **optional** so older backups still import. Imports are validated before any write: entity structure in `src/domain/io/validateBackupEntities.ts` (pure, no dependency), and the `card.deckId` referential rule in `src/data/backup.ts` (mode-dependent, and it must stay ahead of the replace-mode `clear()`). The envelope's `app: 'code-srs'` is a **legacy format identifier, not the product name** - do not rename it. **Changing `src/types/card.ts` or the backup format means updating `docs/prompts/ai-card-prompt.md` in the same pass** - it is a real import contract, and it once drifted into producing files the app refuses.
- `docs/itera-decisions.md` is **append-only**: never edit a past entry's substance in place. If a decision is superseded, add a new dated entry that says so and cross-references the old one — don't rewrite history.
- **When a change reaches finalized state** (a feature is implemented, a design/behavior change is settled — not a WIP/exploratory edit), update documentation in the same pass: `docs/CURRENT_STATE.md` whenever status changes, plus `docs/architecture.md` / `docs/design-system.md` / `docs/features.md` for what they cover, `README.md` for user-facing changes, and `docs/itera-decisions.md` for material decisions (append a new dated entry, never edit one). Don't leave docs describing the pre-change state.
