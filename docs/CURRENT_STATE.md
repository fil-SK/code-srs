# Itera — current repository state

**Last verified against the working tree: 2026-08-16** (branch `app_redesign`, HEAD `0da06de`, plus the login, typography, review-interaction and new-card authoring refinements in this working tree).

The checked-in product baseline is `0da06de`; this working tree adds the finalized login visual refinement described in §5, makes its selected Inter Variable family the app-wide non-code default, refines Review/preview chrome and card interactions, and brings the focused Deck page into closer alignment with the locked `library-use.png` reference. Auth, persistence and routes are unchanged.

This is the agent-neutral "where the project actually stands" document. Any coding agent (Claude, Codex, human) should read this **first**, then go to the deeper docs it links for reasoning and history.

Document boundaries — do not duplicate content across them:

| Document | Answers |
|---|---|
| **this file** | What exists *right now*, what is real vs. placeholder, what is broken, what to do next. |
| [`architecture.md`](architecture.md) | How the system is structured, and which structural rules must not be broken. |
| [`design-system.md`](design-system.md) | How it should look and behave: brand, tokens, navigation, motion, responsive, accessibility, visual-reference tiers. |
| [`features.md`](features.md) | What the product does, plus what is planned and what is out of scope. |
| [`itera-decisions.md`](itera-decisions.md) | Append-only decision log — *why* each thing is the way it is. Read the newest relevant entries first. |
| [`itera-migration-plan.md`](itera-migration-plan.md) | The data-migration contract, with each phase marked completed / partial / not started. |
| [`archive/`](archive/) | **Historical only.** The Phase A audit, the A–M redesign plan, and the original Claude master spec. Never overrides anything above. |

It describes state, not history. It contains no prompts and no conversation transcript.

**Update this file whenever a milestone changes what is real** — that is its whole job, and a stale `CURRENT_STATE.md` is worse than none.

---

## 1. Current product milestone

**Milestone reached: "Login page and a real session boundary" (2026-08-12).**

The redesign has converged: one shared Itera app shell, one Library/Deck implementation, all six v2 review interactions built and production-integrated, all six v2 authoring editors shipped, a real Progress page, a real Account settings page, and a real auth gate in front of everything. The remaining work is no longer visual convergence — it is data-model completion (v2 cards in the real due queue, CardState read cutover, the Collection/Deck migration) and replacing Today's placeholder content with real product logic.

Recent milestone sequence (newest first): Login visual refinement → Login + session boundary → Account menu + Account settings → Ordering card redesign → Library row/preview fixes → Matching board (3 columns) → Progress page → Library polish → flashcard/Library redesign → App Shell and Visual Foundation Convergence.

---

## 2. Implemented primary pages

Real data, real behavior, production-routed:

| Page | Route | Component |
|---|---|---|
| Library browser | `/decks` | `src/features/library/LibraryBrowserPage.tsx` |
| Collection identity view | `/decks?collection=…` (same route) | `src/features/library/LibraryCollectionView.tsx` |
| Focused Deck page | `/decks/:id` | `src/features/library/LibraryDeckPage.tsx` |
| Review session | `/review` | `src/features/review/ReviewPage.tsx` → `ReviewSessionV2` → `reviewV2/ReviewSessionScreen` |
| Card create (v2) | `/decks/:deckId/cards/new` | `src/features/cardsV2/CardCreatePage.tsx` |
| Card edit (v2 + legacy cutover) | `/cards/:id/edit` | `src/features/cardsV2/CardEditEntry.tsx` |
| Card study preview (non-committing) | `/cards/:id/study` | `src/features/cardsV2/CardStudyPreviewPage.tsx` |
| Progress | `/progress` | `src/features/progress/ProgressPage.tsx` |
| Account settings | `/settings`, `/settings/:section` | `src/features/settings/AccountSettingsPage.tsx` |
| Login | `/login` | `src/features/login/LoginPage.tsx` |
| Deck/card preview flip-through | `/preview` | `src/features/preview/PreviewPage.tsx` |

## 3. Partially implemented pages

| Page | What is real | What is placeholder |
|---|---|---|
| **Today** (`/`, `src/features/today/`) | Layout, greeting rotation (`greetings.ts`), the shared shell. | **All numbers.** Streak, weekly goal, recall %, milestone, Continue Learning rows, pace-chart series are illustrative constants. No streak/momentum/suggested-session domain logic exists. "Adjust session" has no behavior. |
| **Progress** (`/progress`) | KPI tiles, heat map, retention chart, deck-performance table, milestones — all computed from real `ReviewLog`/`Card`/`Deck` via `src/domain/stats/{dateRange,progressMetrics}.ts`. "Sessions" are gap-clustered from review timestamps, not a persisted entity. | 7 of 8 sidebar rows (Decks, Activity, Review lag, Milestones, Achievements, Stats, Reports) are `aria-disabled` "Soon" rows. Only Overview is live. |
| **Account settings** (`/settings`) | **Import / Export** (JSON backup) and **Card scheduling** (the Phase D CardState backfill dry-run/apply) are fully functional. | Profile, Email & password, Appearance, Notifications, Privacy, Connected devices are inert greyed placeholders. Profile statistics render em dashes on purpose (D137). |
| **Login** (`/login`) | Page, session minting, redirect-back-to-requested-route, Supabase magic link. | In local mode the password is a dev/demo shell: never stored, sent, or verified. "Forgot password" is a deliberate `aria-disabled` placeholder — no reset backend. |
| **Browse / Drafts / Stats / Card editor (v1)** (`/browse`, `/drafts`, `/stats`, `/cards/new`) | Fully working v1 features. | Visually only reskinned by `.itera-scope`; not redesigned. `/browse` and `/drafts` are **mounted but not linked from any nav** (see §15). |

---

## 4. AppShell / navigation state

- `src/components/layout/AppShell.tsx` = `IteraSurface` (`.itera-scope` + `ForceLightTheme`) → `TopNav` → `<main class="mx-auto max-w-[1280px]">` → `<Outlet/>`.
- `TopNav` is presentational: logo, primary nav links, `rightSlot`. Its wordmark matches the finalized login branding in Inter Variable at weight 650. Primary destinations come from `primaryNavLinks.ts` and are exactly **Today (`/`) · Library (`/decks`) · Progress (`/progress`)**.
- Right side of the nav: `StreakBadge` + `AccountMenu`. Nothing else.
- **There is no global Search and no global Create action** — removed as a product call (both are scoped concepts; search lives inside Library, create inside a deck). `CreateMenu.tsx` and `TopNav`'s search affordance were deleted, not hidden.
- No left sidebar, no bottom nav, no per-route topbar title slot. `Sidebar.tsx` / `BottomNav.tsx` / `navItems.ts` / `PageHeaderOverride.tsx` / `TodayShell.tsx` **were deleted**. A route that needs a heading renders it as ordinary page content.
- Local (page-level) sidebars do exist and are the convention for section navigation: `LibraryShell`/`CollectionNav`, `ProgressShell`/`ProgressNav`, `SettingsNav`.
- Roadmaps (`/roadmaps`) is deliberately absent from primary nav but still routed and functional.
- **The app is light-only.** `.itera-scope` has no dark palette (spec §36 defers dark mode). `ThemeProvider`/`useTheme`/`ThemeToggle.tsx` still exist and are unchanged; `ThemeToggle` is simply not rendered anywhere. Reversible the moment a dark palette exists.

## 5. Login / auth state

- `RequireAuth` (`src/auth/RequireAuth.tsx`) is **one pathless layout route** wrapping the whole `AppShell` tree *and* `/review`. `/login` and `/design-preview/*` sit outside it.
- `AuthProvider` counts **a Supabase session or a `LocalSession`** as signed in (`isAuthenticated`, `identity`); `session` still means the Supabase session specifically and is `null` in local mode. A real Supabase session outranks a local one.
- **Local mode is gated.** A fresh browser lands on `/login` and must sign in or "Continue with demo workspace". No stored data was touched by this; only reachability changed.
- `src/auth/localSession.ts` is the **single** storage seam for auth: one key (`itera.session`), `localStorage` when Remember me is checked, `sessionStorage` otherwise, every access in `try/catch`, a corrupt value reads as signed out. **Do not add a session/`localStorage` check anywhere else.**
- With Supabase configured the only real authentication is **magic-link OTP**. The password field, Remember me and the demo divider are hidden; the button sends a link. No password auth exists.
- `AuthGate` only blocks on the Supabase session bootstrap; it no longer decides what renders.
- The visual shell is a compact, chrome-free 1080px desktop surface. **Inter Variable is the finalized login family**, with the approved headings at weight 650 and body/UI copy in the 400–600 range; the temporary Manrope/Plus Jakarta Sans comparison and packages are gone. The three illustration cards are all 176px wide and retain the `login-v3.png` fan (`Dynamic Programming` −9°/left 52/top 50, `SQL Joins` +5°/left 226/top 40, `System Design` +9°/left 396/top 30), shifted left as a group with the front card lifted slightly. The bottom principles follow `login-icons.png`; illustration and principles still collapse at the established responsive breakpoints.

## 6. Account / avatar menu state

- `AccountMenu` + `AccountMenuContent` (`src/components/layout/`). Built on the existing `FloatingPanel` — **no popover dependency was added.** 300px anchored, viewport-height-capped panel with `manageFocus` (focus enters the menu, arrows/Home/End walk it, Tab closes, Escape returns focus to the trigger). Below 480px (`useIsNarrowShell`) the identical content renders as a bottom sheet.
- Live rows: **Account settings**, **Spaced repetition (FSRS)** (links to Card scheduling), **Import / Export**, and **Sign out** (enabled whenever any session exists — local, demo, or Supabase).
- Placeholder rows: Preferences, Study settings, Keyboard shortcuts, Help & documentation, What's new, About Itera — focusable `aria-disabled` rows with a "Soon" pill (never `disabled`, never hidden).
- The grouped menu follows `profile-menu.png`: account/preferences; a divided study group; keyboard/help; What's new/About; Sign out. **It remains quick navigation only.** New settings still belong in `src/features/settings/`; the menu links only the requested high-value shortcuts.

## 7. Today state

Shell converged, content not. See §3. `TodayPage.tsx` is a real CSS Grid with named `grid-template-areas` (`"hero momentum" / "continue pace"`, one column below 980px via a `matchMedia` hook) driven by inline `style`, because Tailwind has no grid-area utility. Its page typography now uses Inter Variable throughout, matching the finalized login family, including the greeting and the large session-card count. `ContinueLearningList` has an external sentence-case heading plus **View all topics**, with each deck row presenting its content badge, title/truncated description, bold due count, progress + percentage and Continue action. `MomentumPanel` uses sentence-case hierarchy and grouped icon metrics without per-row dividers; streak, weekly goal and recall follow the supplied `inspiration/5.png` direction, while Next milestone retains one section divider. `PaceChart` is the reference-aligned minute-by-weekday area chart with a direct Today label. `SuggestedSessionHero.tsx` is a bespoke, pixel-tuned 4-layer stacked-card component — **do not adjust its offsets/rotations/colors incidentally**; they came from many rounds of measured product feedback. On mount its layers stack themselves back-to-front (each drops from a lift onto its resting box, D170); the resting geometry is unchanged by that reveal.

## 8. Library state

All three views render inside `LibraryShell` + `CollectionNav`: a centered, bordered white two-pane surface whose local sidebar drills all the way to individual decks. The sidebar uses restrained line icons, visible branch connectors, an enlarged add control, card-count rollups, and a footer Settings link; it collapses to `CollectionNavDrawer` below the wide-Library breakpoint.

- **Default Library / All Decks (`/decks`)** — `LibraryBrowserPage`. The All Decks scope follows the locked `all-decks.png` composition: identity title/description and divider, an orange New Deck action plus an Import Deck shortcut to the real JSON Import & Export settings section, 44px search/filter/sort controls, descriptive deck rows with bold metric values, and always-on ten-deck pagination whose count reports the visible range. These proportions are deliberately scoped to **All Decks only**; Unfiled and Collection identity views retain their own compositions. Real `useDecks` + `useSearchCards` + `useSearchCardsV2` + `useDueCards` data drives per-deck cards, due, mastery and last-studied metrics from `deckMetrics.ts`; create / rename / delete remain live.
- **Parent / container ("Collection") view** — `LibraryCollectionView`, rendered by `LibraryBrowserPage` when the selection is a Collection. Identity header, rolled-up stats (`aggregateMetrics`), its child decks, and any cards filed directly on it. A direct `/decks/:id` navigation whose id resolves to a deck-with-children **redirects here** instead of rendering an incorrectly empty leaf page.
- **Focused leaf-Deck view (`/decks/:id`)** — `LibraryDeckPage`. Cards / Insights tab split inside the locked-reference composition: bold final breadcrumb, enlarged aligned metrics, wider 44px toolbar controls, reference-like non-card icons and white surfaces. The Cards tab's search / type / status / sort toolbar and **always-on seven-row pagination** operate over a unified `RowMeta` computed for **both** v1 `Card` and `CardV2Record` rows; multi-page footers report the visible card range. Default manual ordering remains available for v1 cards within the visible page; the grip floats in the row inset so card-type tiles stay close to the list border. Clicking a row **opens the card in preview** (`/preview?card=…` for v1, `/cards/:id/study` for v2); Edit/Duplicate/Move/Suspend/Delete live in the row kebab menu. There is no separate read-only card detail screen, by decision. Deck settings opens with a 24px separation from the identity/action area and closes on a successful save, Cancel, or a second click of its toggle. The identity header and metrics stack at phone widths; the table keeps its deliberate horizontal scroll.

**"Collection" is UI-only.** It is derived structurally from the existing `Deck.parentId` tree in `src/features/library/collectionTree.ts` (any deck with children is a Collection node; childless decks are the browsable Library decks). **There is no `Collection` type, no table, and no migration** — see §13.

## 9. Progress state

Real, mockup-driven, production. `ProgressShell` + `ProgressNav` + `components/*`. Five KPI tiles with period-over-period deltas, an activity heat map with its own 7D/30D/3M/1Y toggle, a deck-scopable retention chart, a deck-performance table, and derived recent milestones — all from real `ReviewLog`/`Card`/`Deck` data. Every chart is hand-rolled SVG/CSS; **no charting library is a dependency and none should be added.** Chart colors deliberately use the locked Itera navy/orange/success/warning tokens, not the mockup's blue/purple.

## 10. Card interaction status

Two axes matter: **Review** (rendering + grading a card) and **Authoring** (creating/editing one). All six v2 interaction types are complete on both axes.

| Interaction | Review view | Grading | Authoring editor | Notes |
|---|---|---|---|---|
| **Recall** | `reviewV2/interactions/recall/RecallView.tsx` | self-graded (no grade function) | `RecallEditorShell` | Absorbs v1 `basic` / `codeReading` / `bugFinding`. Prompt is vertically centered between the type pill and the overlapping-card flip cue. |
| **Multiple Choice** | `multipleChoice/MultipleChoiceView.tsx` | `domain/grading/multipleChoice.ts` (binary) | `MultipleChoiceEditorShell` | Reference-aligned option rows use a circular selection marker plus navy tint and `aria-checked`; the footer pairs mode-specific guidance with a right-aligned Submit action. |
| **Write Code** | `writeCode/WriteCodeView.tsx` | `domain/grading/writeCode.ts` (binary) | `WriteCodeEditorShell` | `WriteCodeInteraction.editableRegion?` is intentionally unconsumed — whole block is editable, documented inline. |
| **Ordering** | `ordering/OrderingView.tsx` + `OrderingRow.tsx` | `domain/grading/ordering.ts` (partial credit) | `OrderingEditorShell` | Redesigned to `ordering-card.png`: each full row is the pointer and keyboard drag target, with a decorative 3×4 dot grip at right and no separate arrow controls. Keyboard flow is Space → arrows → Space; `aria-live` announces the result. The card surface is deliberately inert; only **Submit answer** flips it. |
| **Matching** | `matching/MatchingView.tsx` + `MatchingBoard.tsx` | `domain/grading/matching.ts` (partial credit) | `MatchingEditorShell` | Connected multi-column board with drawn connectors. Check/X badges sit at each connection midpoint; colliding crossing-line midpoints move together to the nearest clear point on their curves. **Capped at three columns.** The old accordion is deleted. |
| **Walkthrough** | `walkthrough/WalkthroughView.tsx` + `StepResponse.tsx` | `domain/grading/walkthrough.ts` (partial credit) | `WalkthroughEditorShell` | Multi-step, multi-range code focus via `LazyCodeView`'s `highlightLines`. Each step can carry its own optional pre-answer tip and post-answer explanation in addition to the card-wide fields. Code-backed Walkthrough cards retain the entrance fade without the ancestor scale/rotation that blurred CodeMirror glyphs. Absorbs v1 `story`. |

Registry: `src/features/reviewV2/interactions/registry.ts` (deliberately `Partial<Record<…>>` so a future 7th type fails loudly). Authoring shells live in `src/features/cardsV2/` with per-type pure form/save modules in `src/domain/cardsV2/`.

**New-card composition:** `/decks/:deckId/cards/new` now follows the locked `add-new-card.png` reference as one continuous 880px surface, expanding to 1120px only while the desktop preview drawer is open. The page header is **Cancel | New card**; Recall is selected by default; the existing six interaction icons are unchanged; numbered Choose interaction / Card content / Organize sections use inset hairlines; Deck and Tags keep their existing values, gain identifying icons and share one explicit control height; Save and bordered Cancel live in the footer. Narrow screens retain Editor/Preview tabs. No character limits or counters were added.

**The v1 8-type registry still exists and is still used** (`src/features/cards/registry/`) for `/cards/new`, `/browse`, and any v1 card not yet edited through the new flow. Editing a legacy v1 card through `/cards/:id/edit` migrates it to a `CardV2Record` on save, same id (so `ReviewLog` history survives), deleting the superseded v1 row.

## 11. Review integration state

- `/review` is a **top-level, chrome-free route** (no `AppShell` ancestor), inside `RequireAuth`. It renders `ReviewSessionV2` → `ReviewSessionScreen`, the exact same shell `/design-preview/review/*` uses. One shell, not two. The shared width-safe Review strip follows `recall-card.png`: a literal **< Exit session** control left, bold position centered, and a bordered keyboard key plus action hint right. Exit and the right-side status/action use the same UI typography; Exit has the expected pointing-hand cursor. The strip's white background and border are full-bleed, while its controls share `TopNav`'s centered 1280px frame so the left/right controls align with the logo/profile edges. Session-backed surfaces also reserve 56px beneath their final content, matching the strip-to-card gap above.
- Flow is strictly two-phase: Question → reveal → Answer → one FSRS grade. Objective types compute an `ObjectiveResult` from `src/domain/grading/*`, show a pass/fail banner, and pre-select a rating the user can override.
- The shared rating controls follow the locked `answer-icons.png` reference: Again uses refresh, Hard ascending bars, Good a circled check, and Easy double chevrons. Each card shows its numeric shortcut plus the real FSRS next interval; the suggested/selected grade receives the single orange outline/icon signal. They render four-across from `sm` upward and 2×2 on phones.
- `/preview` renders the **real v2 card** (`migrateCard` + `ReviewSessionScreen` with `hideRating`), not the v1 registry renderers. It uses the shared Review strip instead of its former tag/jump-input header; `AppShell` gives preview routes a full-width, zero-top-padding main surface so the strip sits flush beneath and spans the same page width as the navbar. In deck flip-through, bordered Prev/Next controls sit immediately around the centered `X of Y`; Left/Right arrows perform the same navigation unless focus is inside an interactive card control or editor. At phone widths the redundant shortcut hint yields its space to this centered navigation group. `/cards/:id/study` uses the same strip treatment without deck navigation. After reveal, preview-only cards say **Answer revealed**; surfaces with rating controls say **Rate your answer** instead of the old `1–4 to rate` hint.
- Every interaction front uses the shared `CardPrompt`: 24px normally, 20px only beyond 280 normalized characters or six non-empty lines. All six v2 editors warn authors when that fallback activates and recommend shortening or splitting the card.
- **Known integration hole (the biggest one in the repo): `CardV2Record`s are never in the due queue.** `useDueCards` → `repo.cards.getDue()` reads v1 `Card` only. `repo.cardsV2.getDue()` is implemented in **both** backends but has **no hook and no caller**. A card authored through the new create flow can only ever be reviewed non-committingly (editor preview, `/cards/:id/study`). See §16.
- Duplication that is known and accepted: `src/hooks/useReview.ts` (v1) still calls the scheduler functions directly instead of `src/domain/scheduling/reviewService.ts`. The v1 `ReviewSession.tsx` / `useReviewSession.ts` remain in the tree, unreferenced.

---

## 12. Persistence / auth / repository architecture that must not be broken

- **One seam: `Repository` (`src/data/repository.ts`).** `getRepository()` (`src/data/index.ts`) returns `DexieRepository` by default, or `SupabaseRepository` when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set. **No component, hook, or page may import a backend directly.**
- Members: `cards`, `cardsV2`, `cardStates`, `decks`, `drafts`, `reviews`, `roadmaps`.
- **Every entity is stored as one opaque JSON blob** keyed by an inline `id` (`data jsonb` in Postgres, a plain object in Dexie). Supabase adds a few generated columns (`due`, `suspended`, `deck_id`) purely for indexing; **all text/tag/type filtering happens in memory identically in both backends** so results match. Adding a field to a type therefore needs no migration.
- **All data access goes through TanStack Query hooks in `src/hooks/`** (`useCards`, `useCardsV2`, `useDecks`, `useDrafts`, `useReview`, `useRoadmaps`, `useBackup`). Query keys are centralized in `src/hooks/queryKeys.ts`.
- **`Card.scheduling` is still the sole source of truth for scheduling.** `Repository.cardStates` is dual-written by every write path (`useGradeCard`, `useUndoGrade`, `usePersistReviewResult`, `useCreateCard`, `useSaveCard`, `useDeleteCard`) but **nothing reads it**. Do not "simplify" by dropping either side of the dual write.
- `CardV2Record` carries **its own embedded `scheduling`**, deliberately independent of the `CardState` extraction.
- **Dexie schema changes require a `version()` bump** in `src/data/dexie/db.ts` (declare only new/changed stores).
- **Supabase tables need GRANTs, not just RLS.** Postgres denies before RLS runs: RLS-without-grant = **403 on every request**; RLS-without-policy = empty 200. Every table in `supabase/schema.sql` needs table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`. `schema.sql` is **not** auto-applied — a human runs it in the SQL editor.
- The Supabase **publishable** key (`sb_publishable_…`) is `VITE_SUPABASE_ANON_KEY`. The secret key must never reach the frontend.
- Backup files (`src/domain/io/backup.ts`, `src/data/backup.ts`) are versioned; new entity arrays are added **optional** so older backups still import.

## 13. Migrations that have NOT happened

| Migration | Status |
|---|---|
| **Phase D — CardState read cutover (steps 4–6)** | Schema, backfill runner, Settings UI and dual-write are shipped. **Parity verification, read cutover, and cleanup have not run.** `Card.scheduling` still backs `getDue()` and everything else. |
| **Phase G — Collection/Deck split** | **Not started. Even the read-only preflight report has never been run.** There is no `Collection` type, no `collections` table, no `src/domain/collections/tree.ts`. The Library ships against the UI-only `parentId` derivation instead. |
| **v1 → v2 card cutover** | `migrateCard(v1) → CardV2` is pure, total across all 8 v1 types, and run **lazily on read** — the only migration allowed to be lazy. v1 rows are only converted to `CardV2Record`s opportunistically, when edited through a v2 editor. There is no bulk conversion and no plan to force one yet. |
| **Phase M cleanup** | `Card.scheduling` removal and stopping the dual write are explicitly deferred. |

`src/domain/migration/runner.ts` (`MigrationRunner`) is the contract every explicit migration must satisfy: dry-run-able, reportable, reversible. See [`itera-migration-plan.md`](itera-migration-plan.md) §0 for why lazy migration was rejected for these.

## 14. Known problems — visual debt

- **`InteractionLabel` is a grey pill; the locked mockups draw it orange** (a soft-orange pill in `matching-card.png`, plain orange text in `ordering-card.png`). Left alone deliberately — the label is shared by all six interaction types, so changing it is a six-card decision, not a per-card one. **Open.**
- **Matching on narrow viewports:** a two-column card now lays out side by side at 390px (verified live). Cards with 3+ columns fall back to the stacked flow. The spec's "stepwise pairing flow on mobile" is only partly satisfied.
- **Today's placeholder numbers** are visible product surface that reads as real data (streak 7, weekly goal, recall %, pace chart). Same for `StreakBadge` in the top nav.
- Roadmaps, Browse, Drafts, Stats and the v1 card editor are **reskinned only** — they carry Itera colors but pre-redesign layout/density.

## 15. Known problems — technical, compatibility and data-risk debt

**Compatibility debt** (v1 code and routes kept deliberately):

- **`/browse` and `/drafts` are mounted but unreachable from any navigation** after the nav rewrite (the old 8-item sidebar was deleted). Direct URL only. Needs an entry-point decision.
- **`/stats` is likewise unlinked** — superseded by `/progress` in primary nav, deliberately left mounted as a direct-URL safety net.
- **Unrouted legacy code kept on purpose:** `src/features/decks/{DecksPage,DeckDetailPage}.tsx` (pending independent re-confirmation of feature parity), `src/features/dashboard/DashboardPage.tsx` (the pre-Itera `/`), `src/features/review/{ReviewSession,useReviewSession}.tsx`. None are dead-code candidates without an explicit decision.
- **Two `FlipCard` implementations.** `src/components/ui/FlipCard.tsx` (v1) has a known accessibility gap — plain `<div onClick>`, no `tabIndex`/role/key handling — and was deliberately **not** fixed in place. `src/features/reviewV2/components/FlipCard.tsx` is the accessible replacement used everywhere v2 renders. Whether to converge them is open.
- **`CardRowV2.tsx` is only rendered by the unrouted `DeckDetailPage`** — production's deck page renders both card kinds through `library/shared/CardTable.tsx`. It survives because `DeckDetailPage` survives.

**Data / migration risk:**

- **Supabase `card_states` and `cards_v2` are unverified against a live database** (the project owner's Supabase project was deleted mid-development). Written to the same standard as the rest of the schema; flagged rather than assumed correct.
- **`cards_v2` exists in `supabase/schema.sql` but has no file under `supabase/migrations/`**, unlike `card_states` (`0001_card_states.sql`). A project built from `schema.sql` gets the table; one migrated file-by-file does not. See [`itera-migration-plan.md`](itera-migration-plan.md) §8.
- **The dual write is load-bearing in one direction only.** Every write path writes both `Card.scheduling` and a `CardState` row; nothing reads the latter. Dropping either side, or pointing a read at `cardStates` outside a deliberate cutover, silently corrupts scheduling.

**Technical debt:**

- **Component tests cannot catch focus/visibility bugs.** `happy-dom` has no visibility semantics, so `HTMLElement.focus()` on a `visibility: hidden` element silently no-ops there but fails in Chromium. Anything focus- or layout-dependent needs a real browser pass.
- **Transitioning a Tailwind-composed `transform` does not animate reliably.** `scale-*`/`rotate-*`/`translate-*` (including `group-hover:` variants) each write a separate custom property; transitioning the composed value snaps instantly in Chromium. Compute such transforms as one literal `style.transform` string in JS.

## 16. Tests / build status

Measured 2026-08-16 on this working tree, after the current visual, Review-interaction and new-card authoring refinements:

```
npx vitest run     → 67 test files, 451 tests, all passing
npx tsc --noEmit   → clean, no errors
npm run lint       → clean, zero warnings
npm run build      → successful (existing chunk-size advisory only)
```

**This is a fully clean baseline.** Lint previously carried one warning from `.scratch-shot.cjs`; those three committed scratch scripts have been deleted, so there are now no warnings at all. Treat any new warning as a regression introduced by the change that caused it.

**451 is the current correct test count.** The additions since the former 429-test baseline cover Ordering surface activation, shared prompt sizing/long-form detection, the mockup-style Review strip, state-aware revealed guidance, preview-route width handling and navigation, Deck-settings dismissal, account-menu shortcuts, rating-control icons/intervals, Matching badge placement, the Multiple Choice selection/footer treatment, the authoring warning and reference-aligned create-flow structure, and Walkthrough step-scoped guidance. The 2026-08-12 login entry in [`itera-decisions.md`](itera-decisions.md) states "447 tests pass"; that older count remains historical because the log is append-only.

Test conventions: colocated `*.test.ts(x)`; the suite is hermetic (`environment: 'node'` globally, `VITE_SUPABASE_*` blanked so tests always hit Dexie via `fake-indexeddb`); `globals` is **not** enabled, so every file imports `describe`/`it`/`expect` from `vitest` explicitly. Component tests opt into a DOM per file with `// @vitest-environment happy-dom` as line 1 **and must add their own `afterEach(() => cleanup())`** — RTL's auto-cleanup never registers without `globals`.

## 17. Exact recommended next milestone

**Bring `CardV2Record`s into the real due queue, so cards authored in the new create flow are actually schedulable.**

This is the only place where a complete, shipped feature (six-type v2 authoring) produces something the product cannot use. Today a user can create a Matching or Walkthrough card and it will never appear in `/review`.

Concrete scope:

1. Add a `useDueCardsV2` hook over the already-implemented `repo.cardsV2.getDue()` (both backends implement it; nothing calls it), with query keys in `queryKeys.ts`.
2. Merge the v1 and v2 due sets into one ordered queue in `ReviewPage` — including the deck-scoping (`?deck=`) path, which currently filters v1 `deckId` only.
3. Persist a grade back onto `CardV2Record.scheduling` (its own embedded scheduling, *not* `cardStates`) through `ReviewService`, and append a `ReviewLog` so Progress/Stats keep working for v2 cards.
4. Extend undo (`useUndoGrade`) to the v2 path.
5. Update the due counts that already read v1 only: `useNavBadges`, `deckMetrics.ts`, Library's due-only filter, Today's counts.
6. Tests: mixed-queue ordering, deck scoping across both kinds, grade → persisted scheduling → no longer due, undo.

Explicitly **not** in this milestone: Phase G's Collection migration, Phase D's read cutover, and Today's real product logic. Those are the next three candidates after it, in that order.

## 18. Important implementation files and directories

**Shell / routing / auth**
- `src/app/router.tsx` — the whole route tree; the structural separation of `/review`, `/login`, `/design-preview/*` lives here.
- `src/components/layout/{AppShell,TopNav,primaryNavLinks,AccountMenu,AccountMenuContent,StreakBadge,useIsNarrowShell,useNavBadges}`
- `src/auth/{RequireAuth,AuthProvider,AuthGate,localSession}.ts(x)`

**Data**
- `src/data/repository.ts` (the seam), `src/data/index.ts` (backend choice), `src/data/dexie/`, `src/data/supabase/`, `src/data/backup.ts`
- `src/hooks/{useCards,useCardsV2,useDecks,useDrafts,useReview,useRoadmaps,useBackup,queryKeys}.ts`
- `supabase/schema.sql`, `supabase/migrations/`

**Card models and migration**
- `src/types/card.ts` (v1, 8-type union) and `src/types/cardV2.ts` (v2: `CardV2`, 6-type `CardInteraction`, `RichContent`, `CardState`, `ReviewEvent`). **When grepping for "Card", check which model you are in.**
- `src/domain/migration/{cardMigration,cardStateBackfill,runner}.ts`

**Review**
- `src/features/reviewV2/{ReviewSessionScreen,reviewPhase}.tsx|ts`, `interactions/{registry,types}.ts`, `interactions/<type>/`, `components/{IteraSurface,ForceLightTheme,FlashcardSurface,FlipCard,FlipCueIcon,CardPrompt,promptLength,TipPanel,ExplanationPanel,RatingControls,InteractionLabel,ReviewTopBar,CardPanel}.tsx|ts`
- `src/domain/grading/{multipleChoice,writeCode,ordering,matching,walkthrough}.ts`
- `src/domain/scheduling/reviewService.ts`, `src/features/review/{ReviewPage,ReviewSessionV2}.tsx`

**Authoring**
- `src/features/cardsV2/` (all six `*EditorShell`s, `*Fields`, `*LivePreview`, `CardTypeChooser`, `CardEditorShell`, shared `CardOrganizeFields`, `CardRowV2`), `src/domain/cardsV2/` (pure form/save modules)
- v1 registry, still live: `src/features/cards/registry/`, `src/features/cards/renderers/`, `src/features/cards/cardTypeMeta.ts`

**Library / Progress / Settings / Today / Login**
- `src/features/library/` (`LibraryBrowserPage`, `LibraryCollectionView`, `LibraryDeckPage`, `collectionTree.ts`, `deckMetrics.ts`, `shared/*`)
- `src/features/progress/`, `src/domain/stats/{dateRange,progressMetrics,computeStats}.ts`
- `src/features/settings/` (`AccountSettingsPage`, `settingsSections.ts`, `sections/*`, `CardStateMigrationSection`)
- `src/features/today/`, `src/features/login/`

**Design system**
- `src/index.css` — both token systems: the general `[data-theme]` tokens and the namespaced `.itera-scope` / `.itera-flip*` Itera set, plus `@theme inline` exposure of `itera-`-prefixed Tailwind utilities.
- `src/components/ui/{Button,Field,FloatingPanel,dialogs,FlipCard}.tsx`, `src/components/text/RichText.tsx`, `src/components/code/`, `src/lib/{cn,id,lazyWithRetry}.ts`

**Preview infrastructure**
- `src/features/design-preview/` — chrome-free fixture routes for the six review interactions and the Library slice. Kept structurally independent from `src/features/library/` (pieces were *adapted*, not imported), so production changes never silently break the previews or vice versa.

---

## 19. Routes

**Behind `RequireAuth` → inside `AppShell`:**

| Route | Page |
|---|---|
| `/` | Today (index route) |
| `/decks` | Library browser (+ Collection view) |
| `/decks/:id` | Focused Deck page (redirects to the Collection view if the id has children) |
| `/decks/:deckId/cards/new` | v2 card create |
| `/roadmaps`, `/roadmaps/:id` | Roadmaps (v1; not in primary nav) |
| `/preview` | Card flip-through preview |
| `/browse` | v1 Browse (**unlinked**) |
| `/cards/new` | v1 card editor (**unlinked**) |
| `/cards/:id/edit` | v2 editor entry (with legacy branch) |
| `/cards/:id/study` | Non-committing study preview |
| `/drafts` | Drafts inbox (**unlinked**) |
| `/stats` | v1 stats (**unlinked**, superseded by `/progress`) |
| `/progress` | Progress |
| `/settings`, `/settings/:section` | Account settings |

**Behind `RequireAuth`, outside `AppShell`:** `/review` (immersive, chrome-free by construction).

**Outside `RequireAuth`:** `/login`; `/design-preview` and `/design-preview/review/{recall,multiple-choice,write-code,ordering,matching,walkthrough}`, `/design-preview/library`, `/design-preview/library-empty`, `/design-preview/library/:deckId`.

### Legacy routes and code still preserved

- `/stats`, `/browse`, `/drafts`, `/cards/new` — routed, working, unlinked.
- `/roadmaps*` — routed and working, deliberately out of primary nav (spec §36 defers it). **Do not delete**; the data, repository member and Supabase table are untouched.
- Unrouted but retained: `DashboardPage.tsx`, `decks/{DecksPage,DeckDetailPage}.tsx`, `review/{ReviewSession,useReviewSession}`.
- Deleted for good (do not resurrect): `Sidebar.tsx`, `BottomNav.tsx`, `navItems.ts`, `PageHeaderOverride.tsx`, `TodayShell.tsx`, `CreateMenu.tsx`, `ProfileMenu.tsx`, `SettingsPage.tsx`, `src/auth/LoginPage.tsx`, `CardDetailPage`.

## 20. Visual system status

Status only. Usage rules — families, weights, scale, icon conventions, the orange rule, portal mechanics, the full token and radius tables — are owned by [`design-system.md`](design-system.md).

**Typography — implemented.** Inter and JetBrains Mono are self-hosted variable webfonts via `@fontsource-variable`, imported at the top of `src/index.css` and bundled by Vite, so the offline PWA has them cached rather than falling back to `system-ui`. Inter is the app-wide non-code default; `--font-itera-sans` and the compatibility `--font-itera-display` token both alias `--font-sans`, while `--font-itera-mono` aliases `--font-mono`. **Gap:** the intended type scale is **not** wired into CSS vars — components use literal Tailwind utilities and match the scale by eye.

**Icons — implemented.** `lucide-react` is the only icon library, at a single version. There are no hand-drawn SVG icon files, with two one-off exceptions inside `SuggestedSessionHero.tsx` (a bracket motif and a logo-derived watermark).

**Tokens — implemented, light-only.** Two systems layer in `src/index.css`: the theme-aware general tokens (`:root` / `[data-theme]`), and an additive `.itera-scope` namespace applied through `IteraSurface`. The Itera scope defines the locked `--itera-*` palette **and re-points the general tokens to Itera values inside the scope** — that re-pointing is the compatibility mechanism by which every pre-existing v1 component reskins with zero edits, so do not "simplify" it away. There is no dark palette (see §4).

**Shared UI foundation — implemented:** `Button`, `Field`, `FloatingPanel`, `dialogs`, `FlipCard` (v1) in `src/components/ui/`; `RichText`/`InlineText`; `LazyCodeView`/`LazyCodeEditor`; `cn()` and `newId()` in `src/lib/`. Contracts and props are in [`design-system.md`](design-system.md) §3; the hand-built-on-purpose rule (no markdown, chart, graph or popover dependency) is in [`architecture.md`](architecture.md).

## 21. Visual-reference workflow

Reference mockups are **not tracked in this repository** — there is deliberately no `docs/references/` directory. They live at `C:\Users\SK\Desktop\itera-mockups\`, and [`design-system.md`](design-system.md) §14 defines the LOCKED / DIRECTION / CONCEPT tiers, the two standing exceptions, and the browser-verification requirement. Read it before implementing against any image.

## 22. Where the rest of the documentation lives

[`README.md`](README.md) is the index and states the source-of-truth hierarchy. In short: **the repository outranks every document**, this file outranks the reference docs on questions of status, and everything under [`archive/`](archive/) is history that never overrides a canonical doc.
