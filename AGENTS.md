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

**`npx tsc --noEmit` is a no-op in this repo** — `tsconfig.json` is solution-style (`"files": []` + `references`), so it checks zero files. Use `npx tsc -b --force`. Test files are excluded from typechecking entirely, so a dangling import in a test surfaces only at Vitest run time.

### Test conventions

Colocated `*.test.ts(x)`. The suite is **hermetic**: `vitest.config.ts` sets `environment: 'node'` globally and blanks `VITE_SUPABASE_*`, so tests always hit the local Dexie backend via `fake-indexeddb`, regardless of a developer's `.env.local`. `globals` is **not** enabled — import `describe`/`it`/`expect` from `vitest` in every file.

Component tests opt into a DOM per file with `// @vitest-environment happy-dom` as the **first line**, and must add their own `afterEach(() => cleanup())` — without `globals`, RTL's automatic cleanup never registers and renders accumulate across `it` blocks. Do not change the global environment.

`happy-dom` has no visibility semantics, so **component tests cannot catch focus or layout bugs**; those need a real browser.

## Architecture constraints

- **One storage seam.** Everything depends on `Repository` (`src/data/repository.ts`); `getRepository()` (`src/data/index.ts`) picks `DexieRepository` or `SupabaseRepository`. **Never import a backend from a component, hook or page.**
- **All data access goes through the TanStack Query hooks in `src/hooks/`**, with keys centralized in `src/hooks/queryKeys.ts`.
- **Entities are opaque JSON blobs** keyed by an inline `id`; Supabase's few generated columns exist only for indexing, and all text/tag/type filtering happens **in memory identically in both backends**. Adding a field to a type needs no migration.
- **One card model.** `src/types/card.ts` — a single `Card` (content + embedded `scheduling`) with six `CardInteraction` members, registry in `src/features/reviewV2/interactions/registry.ts`. The v1 union, `CardV2`/`CardV2Record` and `migrateCard` were deleted when the models converged.
- **New card types are new interactions**; see `docs/architecture.md`.
- **One streak definition.** `computeStreak` (`src/domain/stats/streak.ts`) serves Today, the top-nav `StreakBadge` and Progress. Do not add a second streak calculation; surfaces may present it differently.
- **Today computes nothing in a component.** `TodayPage` is the route's only fetcher; the four panels take computed props, and every Today calculation is a pure function in `src/domain/stats/` (`todayMetrics`, `streak`, `deckMetrics`, `progressMetrics`).
- **A review session's queue is a snapshot.** `src/features/review/useSessionQueue.ts` freezes it per mount and `ReviewSessionV2` is keyed on the snapshot `id`. Keying on the live due query's length (what it used to do) makes every grade remount the session. `/review` takes `?deck=<id>` (subtree scope) and `?limit=<n>`, neither persisted.
- **Adding an entity** means: a `CrudRepo<T>` line in *both* backends + a Dexie `version()` bump + a Supabase table block + a hook + `queryKeys` + inclusion in the backup.
- **No new dependencies for things this repo builds by hand**: no markdown library (`src/components/text/RichText.tsx` is a deliberate XSS-safe subset), no charting library (charts are hand-rolled SVG/CSS), no graph library (roadmap canvas is hand-built SVG), no popover library (`src/components/ui/FloatingPanel.tsx`). CodeMirror must stay lazy-loaded via `LazyCodeView`/`LazyCodeEditor`.
- **The app is light-only and says so** — `.itera-scope` has no dark palette; `index.html`, `getInitialTheme()` both say light, and the dark token block plus `ThemeToggle.tsx` are deleted. Keep `ThemeProvider`/`useTheme` (CodeView/CodeEditor read `Theme` for their syntax palette); do not add dark-mode styling without a dark palette existing first.

## Data-safety constraints

- **Dexie schema changes require a `version()` bump** in `src/data/dexie/db.ts` (declare only new/changed stores; existing ones carry forward).
- **Supabase tables need GRANTs, not just RLS.** Postgres denies before RLS runs: RLS-without-grant = **403 on every request**, RLS-without-policy = empty 200. Every table needs table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`. `supabase/schema.sql` is **not** auto-applied — the user runs it in the Supabase SQL editor, so hand them the exact block.
- The **publishable** key (`sb_publishable_…`) is `VITE_SUPABASE_ANON_KEY`. The secret key must never reach the frontend.
- **`Card.scheduling` is the sole source of truth for scheduling**, embedded in the card itself. The half-built `CardState` extraction (a write-only `cardStates` store nothing read) was removed with the card-model convergence; separating content from scheduling again would be a deliberate schema change with its own migration.
- **Backup files are versioned** (`src/domain/io/backup.ts`); new entity arrays are added **optional** so older backups still import. Imports are validated before any write: entity structure in `src/domain/io/validateBackupEntities.ts`, and the `card.deckId` referential rule in `src/data/backup.ts` (mode-dependent; it must run before the replace-mode `clear()`). `app: 'code-srs'` is a legacy format identifier, not the product name - do not rename it. **Changing the card type or the backup format means updating `docs/prompts/ai-card-prompt.md` in the same pass.**
- **Migrations that touch real user data are explicit, dry-run-able and reportable** via `src/domain/migration/runner.ts`'s `MigrationRunner`. **No migration may be lazy/on-read** — the one that was (`migrateCard`) is gone.
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
- Match the surrounding code: shared inputs via `Field` / `fieldClass` / `selectClass`, buttons via `components/ui/Button`, class merging via `cn` (`src/lib/cn.ts`), ids via `newId()` (`src/lib/id.ts`), confirmations via `useDialogs()` (never `window.confirm`/`prompt`/`alert`).
- oxlint enforces `react-hooks/exhaustive-deps`; when intentionally omitting a dep, use a stable serialized key plus an `// eslint-disable-next-line react-hooks/exhaustive-deps`.
- A CSS `transition` on a Tailwind-**composed** transform (`scale-*`/`rotate-*`/`translate-*`, including `group-hover:` variants) does not animate reliably — compute such transforms as one literal `style.transform` string in JS.
- Keep lazy `import()`s wrapped in `src/lib/lazyWithRetry.ts`'s `importWithReload`, so a stale hashed chunk after a deploy recovers instead of 404ing.
- **`docs/itera-decisions.md` is append-only.** Never edit a past entry's substance; supersede it with a new dated entry that cross-references the old one.
- **When a change reaches finalized state, update docs in the same pass**: `docs/CURRENT_STATE.md` (always, when status changes), plus `docs/architecture.md` / `docs/design-system.md` / `docs/features.md` for what they cover, `README.md` for user-facing changes, and `docs/itera-decisions.md` for material decisions (append a new dated entry, never edit one).
