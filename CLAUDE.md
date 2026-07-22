# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev             # Vite dev server (default http://localhost:5173)
npm run build           # tsc -b (typecheck) then vite build -> dist/
npm run lint            # oxlint (config in .oxlintrc.json)
npm run test            # vitest run (single pass)
npm run test:watch      # vitest watch mode
npx vitest run src/features/cards/renderers/matching/matching.test.ts   # one test file
npx vitest run -t "autoGrade"                                           # tests matching a name
npx tsc --noEmit        # typecheck only (faster than full build when iterating)
```

Tests are colocated as `*.test.ts`/`*.test.tsx` next to the code they cover. The suite is **hermetic**: `vitest.config.ts` sets `environment: 'node'` globally (no DOM, fast) and blanks the `VITE_SUPABASE_*` env vars so tests always hit the local Dexie backend (via `fake-indexeddb`), regardless of a developer's `.env.local`. `globals` is **not** enabled — every test file imports `describe`/`it`/`expect` explicitly from `vitest`.

**Component tests** are the exception and need a DOM: opt in per-file with a `// @vitest-environment happy-dom` pragma as the file's first line (see `src/features/design-preview/review-recall/RecallCardDemo.test.tsx`), rather than changing the global config. `@testing-library/react`, `@testing-library/user-event`, `@testing-library/dom`, and `happy-dom` are devDependencies for this. Because `globals` isn't enabled, RTL's automatic `afterEach` cleanup never registers — any component test file must add its own `afterEach(() => cleanup())` or renders accumulate across `it` blocks within that file (a real failure mode, not theoretical — see that test file's comment).

## Big-picture architecture

React 19 + Vite 8 + TypeScript, Tailwind v4, React Router 7 (`createBrowserRouter`), TanStack Query 5 for all data access, installable PWA (`vite-plugin-pwa`, `registerType: 'autoUpdate'`). Path alias `@` -> `src`.

### Storage seam (the most important abstraction)

The entire app depends on one interface, `Repository` in `src/data/repository.ts`, and never knows which backend is live. `getRepository()` in `src/data/index.ts` picks:

- **`DexieRepository`** (default) — IndexedDB, offline, zero setup.
- **`SupabaseRepository`** — chosen automatically when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set. Postgres, magic-link auth, Row Level Security.

Both back ends store each entity as a **full JSON blob** (`data jsonb` in Postgres; a plain object in Dexie) keyed by an inline `id`. Supabase adds a few **generated columns** (e.g. `due`, `suspended`, `deck_id`) purely so hot queries can be indexed; all text/tag/type filtering happens **in memory identically in both backends** so results match. Because entities are opaque blobs, adding a field to a type needs no migration. Data access is always through TanStack Query hooks in `src/hooks/` (`useCards`, `useDecks`, `useDrafts`, `useReview`, `useRoadmaps`); query keys are centralized in `src/hooks/queryKeys.ts`.

### Card type registry (how card types are added)

Card behavior is data-driven, not hard-coded per page. `Card` (`src/types/card.ts`) is a **discriminated union on `type`**. Each type is one `CardTypeDefinition<T>` (`src/features/cards/registry/types.ts`) bundling `emptyContent`, `isComplete`, optional `autoGrade` / `isResponseReady`, and three React components: `Question`, `Answer`, `Editor`. All definitions are registered in `src/features/cards/registry/index.ts` as an exhaustive `Record<CardType, …>`, so a new type won't compile until it's registered.

`ReviewSession` and `PreviewPage` render any card generically through `CardView` + the registry — they contain **no per-type logic**. The review flow is strictly two-phase: Question → reveal → Answer → one FSRS grade. `interactive: true` gates reveal behind `isResponseReady`; `autoGrade` returning a result shows a pass/fail banner and pre-selects a rating that the user can still override. (The `story` type exploits this: its multi-step walk lives inside its `Question`, and `isResponseReady` keeps the grade bar locked until the last step.)

**To add a card type:** add the content interface + union member in `src/types/card.ts`, create `src/features/cards/renderers/<type>/` (Question/Answer/Editor/index), register it, then satisfy the exhaustive switches the compiler flags — currently `getCardTitle` + `cardTypeMeta` (`src/features/cards/cardTypeMeta.ts`), `searchableText` (`src/domain/search/searchableText.ts`), and `seedContent` (`src/features/drafts/seedContent.ts`). The Browse filter and editor type picker derive from `cardTypeMeta`, so they pick it up automatically.

### The Itera redesign (in progress, parallel to production — read before touching)

This project is mid-redesign into a rebranded product ("Itera": new IA, new 6-type card taxonomy, new visual system). **Read `docs/itera-decisions.md` and `docs/itera-redesign-plan.md` before doing any work in this area** — they are the authoritative, continuously-updated phase plan and decision log; this section is only an orientation pointer, not a substitute. Also present: `docs/itera-repository-audit.md` (the original audit), `docs/itera-migration-plan.md` (data migration contract), `docs/itera-claude-master-spec.md` (the design spec this all derives from, mirrored verbatim).

The redesign proceeds in additive phases and, as of the most recent phase shipped, **nothing below is wired into the production app** — every existing route/component/behavior described elsewhere in this file is still exactly as documented:

- `src/types/cardV2.ts` — a **second**, parallel card model (`CardV2`, `CardInteraction` 6-type union, `RichContent`, `CardState`, `ReviewEvent`) living alongside `src/types/card.ts`'s v1 union, not replacing it. When grepping for "Card," check which one you're in.
- `src/domain/migration/cardMigration.ts` — `migrateCard(v1) -> CardV2`, pure and total across all 8 old types, run lazily on read. This is the **only** migration in the plan allowed to be lazy/on-read; CardState extraction and the Deck/Collection split (later phases) are explicit, dry-run-able, reportable migrations instead — see `itera-migration-plan.md` §0 for why.
- `src/features/reviewV2/components/` — new, reusable v2 Review components (`FlashcardSurface`, `FlipCard`, `TipPanel`, `ExplanationPanel`, `RatingControls`, `InteractionLabel`), meant for direct reuse once production's Review flow is eventually rebuilt.
- `src/features/design-preview/` — `/design-preview/*` routes, registered in `router.tsx` as a **structurally separate top-level route array entry**, not nested under `AppShell` — chrome-free by construction, not by hiding production nav with CSS. New routes are added only once their real components exist (no throwaway mockup routes).
- `.itera-scope` / `.itera-flip*` in `src/index.css` — a fully namespaced token/CSS set for the redesign (locked navy/orange palette, spacing, radii), applied only via the `.itera-scope` class (never the app's `[data-theme]` attribute, to avoid colliding with the existing light/dark toggle). Additive `@theme inline` lines expose `itera-`-prefixed Tailwind utilities alongside the existing ones.
- `src/features/design-preview/ForceLightTheme.tsx` — locally overrides `ThemeContext` (now exported from `src/app/theme.tsx` for exactly this purpose) to a static `'light'` value for a subtree, without touching `document.documentElement` or `localStorage`. Needed because `CodeView` picks its syntax-highlight palette from live theme context, not a CSS var, and the redesign is light-only for now.
- Production's `src/components/ui/FlipCard.tsx` has a known gap (no keyboard/ARIA support) that was deliberately **not** fixed in place — `reviewV2`'s `FlipCard` is a separate, correctly-accessible replacement, so production has zero footprint from this work. Whether to eventually fix the shared one or keep both is an open call, tracked in the decision log.

### Other cross-cutting pieces

- **Scheduling:** FSRS via `ts-fsrs`, wrapped in `src/features/review/useReviewSession.ts`. Manual card `order` is for browsing only; review order is FSRS-driven.
- **Markdown:** a zero-dependency, XSS-safe renderer, `src/components/text/RichText.tsx` (`RichText` for block + fenced code, `InlineText` for inline only). Supports `` `code` ``, `**bold**`, `*italic*`, and fenced blocks. Underscores are intentionally not emphasis markers (snake_case safety). Do not pull in a markdown library.
- **Code display/editing:** CodeMirror 6 is **lazy-loaded** (`LazyCodeView` / `LazyCodeEditor`) to stay out of the main bundle. `CodeView` supports per-line highlighting via `highlightLines` (see `src/components/code/lineRanges.ts`).
- **Entities:** cards, decks (nestable via `parentId`; tree helpers in `src/domain/decks/`), drafts (quick-capture inbox), review logs, and roadmaps (graphs whose nodes reference decks; hand-built SVG canvas in `src/features/roadmaps/`, no graph library). Adding a whole new entity = a `CrudRepo<T>` line in each backend + a Dexie `version()` bump + a Supabase table (see below) + hook + `queryKeys` + inclusion in `src/data/backup.ts`.
- **Auth:** `src/auth/` gates the app only when `isSupabaseConfigured`; local mode has no login.

## Gotchas

- **Supabase requires table GRANTs, not just RLS.** Postgres denies a table before RLS runs, so a missing grant yields a **403 on every request** (RLS-without-grant = 403; RLS-without-policy = empty 200). Every table in `supabase/schema.sql` needs `grant select, insert, update, delete … to authenticated`. When adding a table, add the table + `enable row level security` + an `own rows` policy + the grant, and have the user run that block in the Supabase SQL editor (`schema.sql` is not auto-applied).
- **Dexie schema changes need a `version()` bump** in `src/data/dexie/db.ts` (declare only the new/changed stores; existing ones carry forward).
- **Stale chunk after deploy:** hashed lazy chunks (CodeMirror) 404 on old tabs after a redeploy. `src/lib/lazyWithRetry.ts` (`importWithReload`) and `src/app/RouteError.tsx` reload once to recover; keep lazy `import()`s wrapped.
- The new Supabase **publishable** key (`sb_publishable_…`) is the value for `VITE_SUPABASE_ANON_KEY`; the secret key must never reach the frontend.

## Conventions

- **No em dashes in code comments.** Explain non-obvious *why*, not *what*.
- Match the surrounding code: shared input styling via `Field` / `fieldClass` / `selectClass`, buttons via `components/ui/Button`, class merging via `cn` (`src/lib/cn.ts`), ids via `newId()` (`src/lib/id.ts`).
- oxlint enforces `react-hooks/exhaustive-deps`; when intentionally omitting a dep, use a stable serialized key and an `// eslint-disable-next-line react-hooks/exhaustive-deps` (see `CodeView`, `ReviewSession`).
- Backup files (`src/domain/io/backup.ts`) are versioned; new entity arrays are added **optional** so older backups still import.
- `docs/itera-decisions.md` is **append-only**: never edit a past entry's substance in place. If a decision is superseded, add a new dated entry that says so and cross-references the old one (strikethrough the old text if needed for clarity) — don't rewrite history.
