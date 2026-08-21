# Itera — current repository state

**Last verified against the working tree: 2026-08-22** (branch `app_redesign`).

The most recent milestone completed **Progress correctness and KPI definitions** (Milestone 3): every new `ReviewLog` records the scheduling state before grading, mature retention uses that field through one shared calculation, Progress's headline row is exactly **Learned · Due · Reviews · Retention · Current streak**, and Deck Performance now ranks actionable due work. Prototype ReviewLog history was deliberately discarded rather than reconstructed: Dexie version 2 clears only `reviewLogs`, the versioned Supabase migration deletes the same rows before enforcing the new JSON contract, and backup import rejects any nonconforming row. Cards and decks remain intact. See the 2026-08-21 entry in [`itera-decisions.md`](itera-decisions.md).

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

**Milestone reached: "Progress correctness & KPI definitions" (2026-08-21), on top of "Make Today real", "MVP integrity cleanup" and "Single card model".**

A temporal end-to-end QA pass on 2026-08-21 (import → review → real FSRS persistence → controlled calendar-time advance → due queries → Today → Progress → Review history) returned **PASS WITH ISSUES** with no correctness blocker; its evidence is kept in [`qa_report_21_aug_2026/`](qa_report_21_aug_2026/qa_report_21_8_2026.md). All three findings were closed on 2026-08-22 without new product scope: isolated retention buckets now render as points, streak copy is grammatically correct, and `newId()` no longer assumes a secure context. The phone-width observation in that report did not reproduce as a persistent overflow.

A release-readiness audit on 2026-08-22 ([`audits/audit_22_8_2026.md`](audits/audit_22_8_2026.md)) reproduced a P1 data-loss path in replace-mode import: a file that passed preflight cleared all five stores and then failed mid-write, destroying the prior workspace. **P1-1 is fixed** — every backup array is now validated element-by-element before any write, and the local backend performs replace and merge inside a single Dexie transaction, so a failed import leaves the previous workspace exactly as it was (§12, §15, and the 2026-08-22 decision entry). The audit's other findings are open and are **not** addressed by that pass.

Progress now answers five explicit questions with five honest tiles: unique current active cards learned, cards due now, ReviewLog entries in the selected period, mature retention in that period, and the canonical current streak. `stateBefore` is required on every new ReviewLog, so new/learning graduations never contaminate mature retention and a Review → Again remains an eligible failure. The page retains its heat map, deck-scopable retention chart and milestones; gaps in the retention chart are no longer interpolated. Deck Performance shows leaf/actionable decks with Learned, Due and Retention, including due decks with no period history, ordered around due work. No page was redesigned.

Today's placeholder content is gone. The hero reads the real due queue (count, contributing deck names, and a duration estimated from the learner's own review history); Momentum is four real rows (Current streak, Retention, Due today, Next milestone); Continue Learning lists real decks with real due counts and deck-scoped links; the pace chart plots real reviews-per-day; and the page has honest new-user and caught-up states. Weekly Goal was **removed rather than computed** — no goal concept exists. `Adjust session` is a working dialog (deck scope + card count, nothing persisted), and the Review queue is a per-mount snapshot.


The integrity pass removed the MVP-adjacent surfaces that were telling the user something untrue: the AI card-generation prompt now emits the real v2 single-card import contract instead of the deleted 8-type schema; imported backups are validated structurally (and referentially, per import mode) before anything is written; the account menu's Spaced repetition row no longer navigates to a non-existent settings section; the fabricated "Your name" identity line is gone; and the Library empty state no longer promises an automatic Inbox deck. No page was redesigned and no new feature system was added.

The redesign has converged *and* the retreat is finished. Previously the redesign was complete but the pages it replaced were still mounted-but-unlinked, so a user could reach a pre-redesign screen by URL and two redesigned pages still linked into them. Those pages, their entire transitive closure, and the `/design-preview` Library fork are now gone: 78 production files and 7 test files, leaving exactly one implementation of every surface.

What is real: one shared Itera app shell, one Library/Deck implementation, one Review surface, one flip primitive, **one card model**, one card store, one hook family, all six authoring editors, a semantically correct Progress page with real Review history, a real Account settings page, and a real auth gate in front of everything. Every card authored in any of the six editors is immediately schedulable in `/review`. The primary functional MVP is complete enough to move to **MVP polish / demo readiness**. The Collection/Deck migration and the reskinned-only Roadmaps surface remain later structural/product candidates, not blockers for this MVP milestone.

Recent milestone sequence (newest first): Progress correctness & KPI definitions → Today made real → MVP integrity cleanup → single card model → Review history → v1 legacy surface deleted → Progress iconography → Login visual refinement → Login + session boundary → Account menu + Account settings → Ordering card redesign → Library row/preview fixes → Matching board (3 columns) → Progress page → Library polish → flashcard/Library redesign → App Shell and Visual Foundation Convergence.

---

## 2. Implemented primary pages

Real data, real behavior, production-routed:

| Page | Route | Component |
|---|---|---|
| Library browser | `/decks` | `src/features/library/LibraryBrowserPage.tsx` |
| Collection identity view | `/decks?collection=…` (same route) | `src/features/library/LibraryCollectionView.tsx` |
| Focused Deck page | `/decks/:id` | `src/features/library/LibraryDeckPage.tsx` |
| Review session | `/review` | `src/features/review/ReviewPage.tsx` → `ReviewSessionV2` → `reviewV2/ReviewSessionScreen` |
| Card create | `/decks/:deckId/cards/new` | `src/features/cards/CardCreatePage.tsx` |
| Card edit | `/cards/:id/edit` | `src/features/cards/CardEditEntry.tsx` |
| Card study preview (non-committing) | `/cards/:id/study` | `src/features/cards/CardStudyPreviewPage.tsx` |
| Progress | `/progress` | `src/features/progress/ProgressPage.tsx` |
| Review history | `/progress/history` | `src/features/progress/ReviewHistoryPage.tsx` |
| Account settings | `/settings`, `/settings/:section` | `src/features/settings/AccountSettingsPage.tsx` |
| Login | `/login` | `src/features/login/LoginPage.tsx` |
| Deck/card preview flip-through | `/preview` | `src/features/preview/PreviewPage.tsx` |

## 3. Partially implemented pages

| Page | What is real | What is placeholder |
|---|---|---|
| **Today** (`/`, `src/features/today/`) | **Everything.** Due count, contributing deck names and the duration estimate in the hero; current streak; corrected mature retention; due today; the derived Next milestone; Continue Learning rows; the seven-day pace series; the Adjust session dialog; and the new-user / caught-up / loading states. All computed in `src/domain/stats/{todayMetrics,streak,learned,deckMetrics,progressMetrics}.ts` — `TodayPage` is the only fetcher and the four panels are presentational. | Nothing on the page is fabricated. **Deliberately deferred, not faked:** Weekly Goal (removed — no goal concept exists), a richer milestone/achievement system (the row is a derived deck continuation, not an entity), and advanced session controls (time-boxed, weak-cards, new-vs-review, difficulty/interaction/tag filters, custom FSRS). Continue Learning lists leaf decks only, so cards filed directly on a deck-with-children get no row (they are still counted in the hero and Due today). |
| **Progress** (`/progress`, `/progress/history`) | Headline KPIs are exactly **Learned · Due · Reviews · Retention · Current streak**. Learned/Due/Streak are current-state values with no invented period delta; Reviews/Retention follow the selected period, with retention comparison in percentage points. The heat map, gap-aware deck-scopable retention chart, leaf-deck actionable performance table and milestones are all computed from real `ReviewLog`/`Card`/`Deck` data. **Review history** (`/progress/history`) is a real chronological per-review record, filterable by range/deck/rating. | 7 of 9 sidebar rows (Decks, Activity, Review lag, Milestones, Achievements, Stats, Reports) are `aria-disabled` "Soon" rows. Overview and Review history are live. |
| **Account settings** (`/settings`) | **Import / Export** (JSON backup) is fully functional. | Profile, Email & password, Appearance, Notifications, Privacy, Connected devices are inert greyed placeholders. Profile statistics render em dashes on purpose (D137). |
| **Login** (`/login`) | Page, session minting, redirect-back-to-requested-route, Supabase magic link. | In local mode the password is a dev/demo shell: never stored, sent, or verified. "Forgot password" is a deliberate `aria-disabled` placeholder — no reset backend. |
| **Roadmaps** (`/roadmaps`, `/roadmaps/:id`) | Create / rename / delete / canvas editing all work, now through `useDialogs()` rather than `window.prompt`, and the list page has a real `<h1>`. | Still **reskinned only** — pre-redesign layout and density, carrying Itera colors solely through `.itera-scope`'s token re-point. Deliberately out of primary nav (D11/D17), reachable by direct URL. |

---

## 4. AppShell / navigation state

- `src/components/layout/AppShell.tsx` = `IteraSurface` (`.itera-scope` + `ForceLightTheme`) → `TopNav` → `<main class="mx-auto max-w-[1280px]">` → `<Outlet/>`.
- `TopNav` is presentational: logo, primary nav links, `rightSlot`. Its wordmark matches the finalized login branding in Inter Variable at weight 650. Primary destinations come from `primaryNavLinks.ts` and are exactly **Today (`/`) · Library (`/decks`) · Progress (`/progress`)**.
- Right side of the nav: `StreakBadge` + `AccountMenu`. Nothing else. `StreakBadge` reads the canonical `computeStreak` (`src/domain/stats/streak.ts`) — the same calculation Today and Progress use — and the Today link's due badge (`useNavBadges`) has always been a real count.
- **There is no global Search and no global Create action** — removed as a product call (both are scoped concepts; search lives inside Library, create inside a deck). `CreateMenu.tsx` and `TopNav`'s search affordance were deleted, not hidden.
- No left sidebar, no bottom nav, no per-route topbar title slot. `Sidebar.tsx` / `BottomNav.tsx` / `navItems.ts` / `PageHeaderOverride.tsx` / `TodayShell.tsx` **were deleted**. A route that needs a heading renders it as ordinary page content.
- Local (page-level) sidebars do exist and are the convention for section navigation: `LibraryShell`/`CollectionNav`, `ProgressShell`/`ProgressNav`, `SettingsNav`.
- Roadmaps (`/roadmaps`) is deliberately absent from primary nav but still routed and functional.
- **The app is light-only, and now says so.** `.itera-scope` has no dark palette (spec §36 defers dark mode). `index.html` declares `data-theme="light"` with no pre-paint restore script, and `getInitialTheme()` falls back to `'light'` — previously both said `dark`, which darkened the pre-router `AuthGate` screen because it renders outside `.itera-scope` and reads `--bg` from `:root`. `ThemeToggle.tsx`, the inert `dark` custom-variant and the unreachable `[data-theme='dark']` token block are **deleted**. `ThemeProvider`/`useTheme` are retained, and `Theme` keeps its `'dark'` member, because `CodeView`/`CodeEditor` select the `oneDark` syntax palette from it. Re-adding dark mode means re-authoring those 16 tokens.

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
- Live rows: **Account settings**, **Import / Export**, and **Sign out** (enabled whenever any session exists — local, demo, or Supabase).
- Placeholder rows: Preferences, Study settings, **Spaced repetition (FSRS)**, Keyboard shortcuts, Help & documentation, What's new, About Itera — focusable `aria-disabled` rows with a "Soon" pill (never `disabled`, never hidden). Spaced repetition joined that list on 2026-08-18: it used to link to `/settings/card-scheduling`, which is not a slug in `settingsSections.ts`, so `resolveSection` silently landed the user on Profile.
- The header block shows **real identity only**. There is no profile record and no display name in this product, so it renders the session's email (or "Demo workspace" for the demo identity, matching `AccountSettingsPage`'s subtitle) over a line saying where the data lives — "Stored in this browser" / "Synced with Supabase" / "Local data only". The former hardcoded **"Your name"** line is gone; it read as fabricated account data.
- The grouped menu follows `profile-menu.png`: account/preferences; a divided study group; keyboard/help; What's new/About; Sign out. **It remains quick navigation only.** New settings still belong in `src/features/settings/`; the menu links only the requested high-value shortcuts.

## 7. Today state

**Real, production.** `TodayPage.tsx` is still the same CSS Grid with named `grid-template-areas` (`"hero momentum" / "continue pace"`, one column below 980px via a `matchMedia` hook) driven by inline `style`, because Tailwind has no grid-area utility, and the page typography is unchanged. What changed is the data: `TodayPage` is now the route's only fetcher (`useSearchCards`, `useDueCards`, `useDecks`, `useReviewLogs`, `now` snapshotted once per mount so it agrees with `/review`), memoizes pure calls into `src/domain/stats/`, and hands plain props to four presentational panels.

- **`SuggestedSessionHero.tsx`** — the bespoke, pixel-tuned 4-layer stacked card is untouched (**do not adjust its offsets/rotations/colors incidentally**; the settled transforms were re-measured against D170 after this milestone and match exactly). Its content is now the real due count, real contributing deck names in queue order (`A · B · C · +N more`), and a duration estimate from the median of the learner's own recent review durations, with a documented 20s-per-card fallback below 10 usable samples. When nothing is due the same box reads **All caught up / Nothing due** with the real next-due time, the primary action becomes Go to Library, and **Adjust session is not rendered** — no scope or size can create due work.
- **`MomentumPanel.tsx`** — four real rows in the same visual slots: **Current streak** (canonical `computeStreak`), **Retention** (the shared `computeRetention` over a trailing 30 days, eligible only when `stateBefore` is Review/Relearning; an em dash, never `0%`, when nothing is mature), **Due today** (the same count as the hero and `/review`), and **Next milestone** (a derived in-progress-deck continuation — "Finish X / n of m cards learned" — linking at a real session only when one exists). Weekly Goal was deleted; Retention took its slot, so the row rhythm and the single divider above Next milestone are unchanged.
- **`ContinueLearningList.tsx`** — real leaf decks with real due counts, real mastery percentages and the deck's own description when it has one, ordered due-first then most-recently-studied. A deck with due cards links to `/review?deck=<id>` ("Continue"); one without links to `/decks/<id>` ("Open"). The heading link is now **View all decks** — there is no topic concept in this product.
- **`PaceChart.tsx`** — the same hand-rolled SVG, now plotting **reviews completed per local calendar day** over seven buckets ending today, with a data-derived axis. `You're on track` is gone: it claimed progress toward a target that does not exist.
- **`AdjustSessionDialog.tsx`** — new. Deck scope (all due / one deck, using `/review`'s own `subtreeIds` semantics and listing every deck by full path) plus session size (all / 10 / 20 / 30 / custom), starting `/review?deck=&limit=`. Centered modal on desktop, bottom sheet below 480px. **Nothing is persisted.**
- **Page states** — a `Loading…` line until the four queries resolve (an empty due result is otherwise indistinguishable from "not fetched", and the grid would flash "All caught up"); one intentional empty state when there are no decks and no cards; otherwise the grid.

## 8. Library state

All three views render inside `LibraryShell` + `CollectionNav`: a centered, bordered white two-pane surface whose local sidebar drills all the way to individual decks. The sidebar uses restrained line icons, visible branch connectors, an enlarged add control, card-count rollups, and a footer Settings link; it collapses to `CollectionNavDrawer` below the wide-Library breakpoint.

- **Default Library / All Decks (`/decks`)** — `LibraryBrowserPage`. The All Decks scope follows the locked `all-decks.png` composition: identity title/description and divider, an orange New Deck action plus an Import Deck shortcut to the real JSON Import & Export settings section, 44px search/filter/sort controls, descriptive deck rows with bold metric values, and always-on ten-deck pagination whose count reports the visible range. These proportions are deliberately scoped to **All Decks only**; Unfiled and Collection identity views retain their own compositions. Real `useDecks` + `useSearchCards` + `useDueCards` data drives per-deck cards, due, mastery and last-studied metrics from `deckMetrics.ts`; create / rename / delete remain live.
- **Parent / container ("Collection") view** — `LibraryCollectionView`, rendered by `LibraryBrowserPage` when the selection is a Collection. Identity header, rolled-up stats (`aggregateMetrics`), its child decks, and any cards filed directly on it. A direct `/decks/:id` navigation whose id resolves to a deck-with-children **redirects here** instead of rendering an incorrectly empty leaf page.
- **Focused leaf-Deck view (`/decks/:id`)** — `LibraryDeckPage`. Cards / Insights tab split inside the locked-reference composition: bold final breadcrumb, enlarged aligned metrics, wider 44px toolbar controls, reference-like non-card icons and white surfaces. The Cards tab's search / type / status / sort toolbar and **always-on seven-row pagination** operate over a `RowMeta` projection of the one card list; multi-page footers report the visible card range. Manual drag ordering applies to every card within the visible page; the grip floats in the row inset so card-type tiles stay close to the list border. Clicking a row **opens the card in study preview** (`/cards/:id/study`); Edit/Duplicate/Move/Suspend/Delete live in the row kebab menu. There is no separate read-only card detail screen, by decision. Deck settings opens with a 24px separation from the identity/action area and closes on a successful save, Cancel, or a second click of its toggle. The identity header and metrics stack at phone widths; the table keeps its deliberate horizontal scroll.

**"Collection" is UI-only.** It is derived structurally from the existing `Deck.parentId` tree in `src/features/library/collectionTree.ts` (any deck with children is a Collection node; childless decks are the browsable Library decks). **There is no `Collection` type, no table, and no migration** — see §13.

## 9. Progress state

Real, mockup-driven, production. `ProgressShell` + `ProgressNav` + `components/*`. The five headline tiles are exactly **Learned · Due · Reviews · Retention · Current streak**. Streak copy is singular at one day (`Best: 1 day`), through the shared `formatDayCount` in `src/domain/stats/streak.ts` that Today's Momentum panel uses too. Learned is unique current non-suspended cards with at least one log; Due reuses `useDueCards`; Reviews is the number of logs in the selected period; Retention is successful mature attempts (`stateBefore` Review/Relearning and rating Hard or better) divided by all mature attempts; Current streak reuses `computeStreak`. Only Reviews and Retention receive period comparisons, and Retention renders that change in percentage points (`pp`). The page retains the activity heat map, deck-scopable retention chart and derived recent milestones. Missing retention buckets break the SVG into separate path segments instead of implying observations across gaps, and an observed bucket with no observed neighbour is drawn as a point rather than dropped — `retentionChartPath.ts` owns the projection and returns both, so lines and markers cannot disagree. Every chart is hand-rolled SVG/CSS; **no charting library is a dependency and none should be added.**

Deck Performance contains **Deck · Learned · Due · Retention** and no misleading Trend. It intentionally lists **leaf/actionable decks only**, so every column in a row has one direct-card scope and parent/child work is not double-counted. A deck with active cards remains visible even with zero reviews in the selected period. Ordering is: has due work, larger due count, weaker valid retention, most recently studied, then name. Rows with work due open `/review?deck=<id>`; the others open the deck. The accepted leaf rule means cards filed directly on a deck-with-children do not get their own row, matching Continue Learning's existing tradeoff; they still contribute to global KPIs and the parent-scoped Review route.

**Review history** (`/progress/history`, `ReviewHistoryPage.tsx`) is the second live Progress destination: one row per `ReviewLog`, newest first, with card, deck, rating, resulting interval and timestamp, filterable by range (30D/3M/1Y/**All**, its own local presets — *not* the shared `DATE_RANGE_PRESETS`, whose bounded windows exist for Overview's period-over-period deltas), by deck (including the deck's subtree) and by rating. Reviews whose card was since deleted are kept, shown as `(deleted card)`; rows logged before `ReviewLog.dueAfter` existed render an em dash for interval rather than a fabricated number. Rating pills are deliberately neutral rather than a danger/warning/success/accent set, with the palest accent tint on Again only (see the decisions log). The "Activity" sidebar row stays a "Soon" placeholder on purpose — it reads as a broader feed (cards created, decks edited, imports) and the name is left free for it.

Retention chart and Review-history attribution go through `src/domain/stats/cardDeckIndex.ts`'s `buildCardDeckMap(cards)`, built once per render and passed down. Deck Performance receives current cards directly because it needs active-card, Learned and Due membership as well as historical attribution. In both cases a moved card follows its current deck and a deleted card's old log is not attributed to a current deck.

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

Registry: `src/features/reviewV2/interactions/registry.ts` (deliberately `Partial<Record<…>>` so a future 7th type fails loudly). Authoring shells live in `src/features/cards/` with per-type pure form/save modules in `src/domain/cards/`.

**New-card composition:** `/decks/:deckId/cards/new` now follows the locked `add-new-card.png` reference as one continuous 880px surface, expanding to 1120px only while the desktop preview drawer is open. The page header is **Cancel | New card**; Recall is selected by default; the existing six interaction icons are unchanged; numbered Choose interaction / Card content / Organize sections use inset hairlines; Deck and Tags keep their existing values, gain identifying icons and share one explicit control height; Save and bordered Cancel live in the footer. Narrow screens retain Editor/Preview tabs. No character limits or counters were added.

**There is one card model, one rendering path and one authoring path.** `src/features/cards/` holds the six editor shells; `src/features/reviewV2/interactions/` holds the six views.

`/cards/:id/edit` is one switch on `interaction.type` picking the matching editor shell; saving reuses the card's id/createdAt/scheduling/suspended so `ReviewLog` history survives. Its fallthrough is a **"Card not found"** state, reachable only for an id that resolves to no card.

## 11. Review integration state

- `/review` is a **top-level, chrome-free route** (no `AppShell` ancestor), inside `RequireAuth`. It renders `ReviewSessionV2` → `ReviewSessionScreen`, the exact same shell `/design-preview/review/*` uses. One shell, not two. The shared width-safe Review strip follows `recall-card.png`: a literal **< Exit session** control left, bold position centered, and a bordered keyboard key plus action hint right. Exit and the right-side status/action use the same UI typography; Exit has the expected pointing-hand cursor. The strip's white background and border are full-bleed, while its controls share `TopNav`'s centered 1280px frame so the left/right controls align with the logo/profile edges. Session-backed surfaces also reserve 56px beneath their final content, matching the strip-to-card gap above.
- **The session queue is a snapshot.** `/review` accepts `?deck=<id>` (that deck plus its subtree) and `?limit=<n>` (the first n cards, ignored unless it is a positive integer); `src/features/review/useSessionQueue.ts` freezes the resolved queue when the session starts, and `ReviewSessionV2` is keyed on that snapshot's id. It used to be keyed on `cards.length` over the live due query, so every grade remounted the session — the counter shrank (`1 of 5` → `2 of 5` → `2 of 4`), the undo stack was lost, and the last card landed on the pre-session "Nothing due" state instead of "All done". A snapshot lives for one mount, so leaving `/review` ends the session and a later visit at the identical URL resolves a fresh queue. Neither parameter is persisted; there is still no `StudySession` entity.
- Flow is strictly two-phase: Question → reveal → Answer → one FSRS grade. Objective types compute an `ObjectiveResult` from `src/domain/grading/*`, show a pass/fail banner, and pre-select a rating the user can override.
- `buildReviewLog` records both required `stateBefore` (the scheduling state immediately before the grade) and `state` (the resulting post-grade state). Mature retention consults only `stateBefore`; there is no post-state fallback for prototype rows.
- The shared rating controls follow the locked `answer-icons.png` reference: Again uses refresh, Hard ascending bars, Good a circled check, and Easy double chevrons. Each card shows its numeric shortcut plus the real FSRS next interval; the suggested/selected grade receives the single orange outline/icon signal. They render four-across from `sm` upward and 2×2 on phones.
- `/preview` renders the **real card** through `ReviewSessionScreen` with `hideRating`. It uses the shared Review strip instead of its former tag/jump-input header; `AppShell` gives preview routes a full-width, zero-top-padding main surface so the strip sits flush beneath and spans the same page width as the navbar. In deck flip-through, bordered Prev/Next controls sit immediately around the centered `X of Y`; Left/Right arrows perform the same navigation unless focus is inside an interactive card control or editor. At phone widths the redundant shortcut hint yields its space to this centered navigation group. `/cards/:id/study` uses the same strip treatment without deck navigation. After reveal, preview-only cards say **Answer revealed**; surfaces with rating controls say **Rate your answer** instead of the old `1–4 to rate` hint.
- Every interaction front uses the shared `CardPrompt`: 24px normally, 20px only beyond 280 normalized characters or six non-empty lines. All six v2 editors warn authors when that fallback activates and recommend shortening or splitting the card.

---

## 12. Persistence / auth / repository architecture that must not be broken

- **One seam: `Repository` (`src/data/repository.ts`).** `getRepository()` (`src/data/index.ts`) returns `DexieRepository` by default, or `SupabaseRepository` when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set. **No component, hook, or page may import a backend directly.**
- Members: `cards`, `decks`, `drafts`, `reviews`, `roadmaps`.
- **Every entity is stored as one opaque JSON blob** keyed by an inline `id` (`data jsonb` in Postgres, a plain object in Dexie). Supabase adds a few generated columns (`due`, `suspended`, `deck_id`) purely for indexing; **all text/tag/type filtering happens in memory identically in both backends** so results match. Adding a field to a type therefore needs no migration.
- **All data access goes through TanStack Query hooks in `src/hooks/`** (`useCards`, `useDecks`, `useDrafts`, `useReview`, `useRoadmaps`, `useBackup` — there is one card hook family, not two). Query keys are centralized in `src/hooks/queryKeys.ts`.
- **`Card.scheduling` is the sole source of truth for scheduling**, embedded on the card itself. The half-built `CardState` extraction (a write-only store nothing read) was removed with the card-model convergence; separating content from scheduling again is a deliberate schema change with its own migration, not a refactor.
- **Dexie schema changes require a `version()` bump** in `src/data/dexie/db.ts` (declare only new/changed stores). Version 2 is a deliberate data-only upgrade: it clears `reviewLogs` and nothing else so an old row without required `stateBefore` can never enter current analytics.
- **Supabase tables need GRANTs, not just RLS.** Postgres denies before RLS runs: RLS-without-grant = **403 on every request**; RLS-without-policy = empty 200. Every table in `supabase/schema.sql` needs table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`. `schema.sql` is **not** auto-applied — a human runs it in the SQL editor.
- The Supabase **publishable** key (`sb_publishable_…`) is `VITE_SUPABASE_ANON_KEY`. The secret key must never reach the frontend.
- Backup files (`src/domain/io/backup.ts`, `src/data/backup.ts`) remain at version 2; no envelope bump was needed because the format already includes `reviewLogs`, AI-generated imports intentionally carry an empty array, and stricter validation of an already-required shape is not a format change. **Imports are validated before any write**: `parseBackup` validates every entity in every array it will write — cards, decks, ReviewLogs (including required `stateBefore`, numeric rating/timestamps and both scheduling states), **drafts and roadmaps** — so an incompatible nonempty prototype-history backup, or an entity IndexedDB cannot key, is rejected rather than imported. `importBackup` then applies the repository-aware `card.deckId` rule before any write. **Replace is all-or-nothing on the local backend**: `repo.replaceAll()` runs the clear and the write inside one Dexie `rw` transaction, so a failed replace-import leaves the previous workspace exactly as it was; on Supabase there is no cross-request transaction, so Replace is refused rather than emulated (see §15 and the 2026-08-22 decision entry). The `app: 'code-srs'` marker remains a legacy format identifier, not the product name.

## 13. Migrations that have NOT happened

| Migration | Status |
|---|---|
| **Phase G — Collection/Deck split** | **Not started. Even the read-only preflight report has never been run.** There is no `Collection` type, no `collections` table, no `src/domain/collections/tree.ts`. The Library ships against the UI-only `parentId` derivation instead. |

`src/domain/migration/runner.ts` (`MigrationRunner`) is the contract every explicit migration must satisfy: dry-run-able, reportable, reversible. See [`itera-migration-plan.md`](itera-migration-plan.md) §0 for why lazy migration was rejected for these.

## 14. Known problems — visual debt

- **`InteractionLabel` is a grey pill; the locked mockups draw it orange** (a soft-orange pill in `matching-card.png`, plain orange text in `ordering-card.png`). Left alone deliberately — the label is shared by all six interaction types, so changing it is a six-card decision, not a per-card one. **Open.**
- **Matching on narrow viewports:** a two-column card now lays out side by side at 390px (verified live). Cards with 3+ columns fall back to the stacked flow. The spec's "stepwise pairing flow on mobile" is only partly satisfied.
- **Roadmaps is the last reskinned-only surface** — it carries Itera colors but pre-redesign layout/density. It is the only one left; Browse, Drafts, Stats and the v1 card editor were deleted rather than redesigned.

## 15. Known problems — technical, compatibility and data-risk debt

**Compatibility debt** (what remains after the v1 surface was deleted):

- **`/roadmaps*` is routed and working but out of primary nav** (D11/D17), so it is direct-URL only, and it is still visually pre-redesign (§14). **Do not delete it** — the data, repository member and Supabase table are untouched.
- **`src/hooks/useDrafts.ts` is a deliberately retained orphan.** The drafts UI was deleted, but the entity survives end to end: `repo.drafts`, the Dexie store, and the `drafts` array in backup import/export. The hook has no caller. **Do not "clean it up"** — deleting it would be the first step toward dropping user data that a backup file still round-trips.

**Data / migration risk:**

- **Replace-import is unavailable on the Supabase backend.** PostgREST has no transaction spanning requests, so a five-table clear followed by five uploads can stop halfway and cannot be rolled back. `SupabaseRepository.replaceAll` therefore throws before issuing any request, `canReplaceImport()` returns false, and the Import / Export section renders Replace as an `aria-disabled` option with the reason. Merge is unaffected. Closing this needs a database-side function doing the delete + insert for all five tables in one transaction; it is recorded in [`TODO.md`](TODO.md) and deliberately not written blind against a project that cannot be tested.
- **The Supabase schema and `0003_review_log_state_before.sql` are unverified against a live database** (the project owner's Supabase project was deleted mid-development). Migration 0003 deliberately deletes prototype `review_logs`, adds the required-`stateBefore` JSON check, and re-grants authenticated CRUD. Written to the same standard as the rest of the schema; flagged rather than assumed correct.

**Technical debt:**

- **Component tests cannot catch focus/visibility bugs.** `happy-dom` has no visibility semantics, so `HTMLElement.focus()` on a `visibility: hidden` element silently no-ops there but fails in Chromium. Anything focus- or layout-dependent needs a real browser pass.
- **Transitioning a Tailwind-composed `transform` does not animate reliably.** `scale-*`/`rotate-*`/`translate-*` (including `group-hover:` variants) each write a separate custom property; transitioning the composed value snaps instantly in Chromium. Compute such transforms as one literal `style.transform` string in JS.
- **`npx tsc --noEmit` is a no-op in this repo and must not be used as the typecheck gate.** `tsconfig.json` is solution-style (`"files": []` plus `references`), so that command checks zero files and is trivially "clean" — every doc and decision entry that cites it as evidence is citing nothing. The real gate is **`npx tsc -b --force`** (what `npm run build` runs). Related: `tsconfig.app.json` excludes `*.test.ts(x)`, so **test files are never typechecked** — a dangling import inside a test surfaces only as a Vitest resolve error at run time, never as a type error, and an inline fixture can silently rot into a shape that no longer exists (`src/data/backup.test.ts` carried a deleted v1 card until 2026-08-18). Delete test files *before* the modules they cover, and for entity fixtures that must stay true to a type, put them in a non-test module — `src/domain/io/backupFixtures.ts` is the pattern.

## 16. Tests / build status

Measured 2026-08-22, after the replace-import data-safety fix (audit P1-1):

```
npx vitest run       → 78 test files, 637 tests, all passing (45.73s)
npx tsc -b --force   → clean, no errors
npm run lint         → clean, zero warnings
npm run build        → successful (existing chunk-size advisory only)
```

**This is a fully clean baseline.** Treat any new warning as a regression introduced by the change that caused it.

**637 is the current correct test count.** The replace-import fix added 49 across three new files (`src/data/dexie/replaceAll.test.ts` — the transaction-rollback regression suite, `src/domain/io/importFailure.test.ts`, and `src/data/supabase/SupabaseRepository.test.ts`, the first test in that directory) plus Draft/Roadmap validation cases and full-workspace round-trip/merge cases in the existing backup suites.

**588 was the count before it.** The QA cleanup pass added 19 across two new files (`retentionChartPath.test.ts`, `id.test.ts`) plus additions to the retention-chart, streak and Progress suites: isolated retention buckets in every gap position, day-count pluralization, and both `newId()` branches.

**569 was the count before it**, across 73 files, up from 535 across 68 files. Milestone 3 added 34 tests across five new files: pre/post scheduling-state logging, mature-retention examples, the canonical Learned helper, current/period KPI definitions, actionable leaf-deck rows, ReviewLog backup validation, the Dexie history reset, KPI presentation, and retention-chart gaps.

**535 was the count before it.** Milestone 2 added 110 tests for the canonical streak, the Today statistics boundary, page states, Adjust session, the nav badge, `limit`, and the Review queue snapshot.

**425 was the count before it.** Earlier revisions of this section carried two contradictory numbers (390 and 451); 390 was the measured count immediately after the single-card-model pass, and 451 was a stale carry-over from before it. Both are superseded. The single-card-model pass had brought the count down from 432 by deleting the migration and CardState suites outright (their subjects no longer exist) and removing the six per-type "migrates a legacy v1 card" cases plus the legacy form-hydration cases — not a coverage loss, since none of that code remains. The MVP integrity cleanup then added 35: backup entity validation, deck-reference validation across Merge/Replace, and the account-menu placeholder/identity assertions.

Older counts quoted in [`itera-decisions.md`](itera-decisions.md) (429, 445, 447) remain historical, because that log is append-only.

**The `MatchingEditorShell.test.tsx` timeout reported in an earlier audit does not reproduce.** Three full `npx vitest run` passes on 2026-08-18 (one before this milestone's changes, two after) completed in 36.0s, 35.5s and 54.7s with zero failures and no timeout; the slowest was simply a busier machine, and no individual test approached its limit. No test-timeout value was changed, and Vitest's global timeout was not raised. **The unidentified single-run flake noted on 2026-08-17 resurfaced once on 2026-08-22** — one test in one full run failed while the other **eight** full runs that day (two before it, six after) were clean at 588/588. Its name was lost to a truncated console capture, which is the whole reason it is still unidentified: **when a run fails, capture the complete output, not the tail.**

Test conventions: colocated `*.test.ts(x)`; the suite is hermetic (`environment: 'node'` globally, `VITE_SUPABASE_*` blanked so tests always hit Dexie via `fake-indexeddb`); `globals` is **not** enabled, so every file imports `describe`/`it`/`expect` from `vitest` explicitly. Component tests opt into a DOM per file with `// @vitest-environment happy-dom` as line 1 **and must add their own `afterEach(() => cleanup())`** — RTL's auto-cleanup never registers without `globals`.

## 17. Exact recommended next milestone

**MVP polish / demo readiness.** The functional MVP is complete enough that the next pass should improve demonstration quality and remove remaining high-value friction rather than open another feature milestone. Keep it evidence-led: exercise the first-run → create/import → review → Progress loop with representative content, fix concrete copy/accessibility/responsive defects found there, and prepare a stable demo dataset/checklist.

Collection/Deck Phase G and the Roadmaps reskin remain later candidates. Neither should be folded into polish implicitly: Phase G is a real data-model migration and Roadmaps is deliberately outside the primary MVP navigation.

---

## 18. Routes

**Behind `RequireAuth` → inside `AppShell`:**

| Route | Page |
|---|---|
| `/` | Today (index route) |
| `/decks` | Library browser (+ Collection view) |
| `/decks/:id` | Focused Deck page (redirects to the Collection view if the id has children) |
| `/decks/:deckId/cards/new` | Card create |
| `/roadmaps`, `/roadmaps/:id` | Roadmaps (v1; not in primary nav) |
| `/preview` | Card flip-through preview |
| `/cards/:id/edit` | Card editor entry — one switch over the six `interaction.type` members; a "Card not found" state otherwise |
| `/cards/:id/study` | Non-committing study preview |
| `/progress` | Progress |
| `/progress/history` | Review history |
| `/settings`, `/settings/:section` | Account settings |

**Behind `RequireAuth`, outside `AppShell`:** `/review` (immersive, chrome-free by construction).

**Outside `RequireAuth`:** `/login`; `/design-preview` and `/design-preview/review/{recall,multiple-choice,write-code,ordering,matching,walkthrough}`.

An unmatched path renders `RouteError`'s **"Page not found"** branch (`isRouteErrorResponse` + status 404) with a link to Today, rather than the generic "the app may have just updated, reload" copy — reloading a deleted route only lands there again.

### Legacy routes and code still preserved

- `/roadmaps*` — routed and working, deliberately out of primary nav (spec §36 defers it). **Do not delete**; the data, repository member and Supabase table are untouched.
- Retained with no caller, on purpose: `src/hooks/useDrafts.ts` (+ `repo.drafts`, the Dexie store, and `drafts` in backup import/export). The drafts *UI* was deleted; the *data* was not. See §15.
- Deleted for good (do not resurrect): `Sidebar.tsx`, `BottomNav.tsx`, `navItems.ts`, `PageHeaderOverride.tsx`, `TodayShell.tsx`, `CreateMenu.tsx`, `ProfileMenu.tsx`, `SettingsPage.tsx`, `src/auth/LoginPage.tsx`, `CardDetailPage`.
- **Deleted 2026-08-17 with the v1 legacy surface** (do not resurrect): the `/browse`, `/cards/new`, `/drafts` and `/stats` routes and their pages; `src/features/cards/{registry,renderers}/` (all 8 families), `CardRow.tsx`, `CardTypeBadge.tsx`, `CardView.tsx`; `src/features/{dashboard,decks,drafts,stats}/` entirely; `src/features/review/{ReviewSession,GradeBar,useReviewSession}`; `src/components/ui/FlipCard.tsx`; `src/components/layout/ThemeToggle.tsx`; `src/components/code/{CodeBlockField,lineRanges}`; `src/domain/grading/normalize.ts`; `src/domain/stats/computeStats.ts`; `src/features/cards/{CardRowV2,shared/InteractionTypeBadge}.tsx`; and the entire `design-preview/library-{browser,deck,shared}/` fork.

## 19. Visual system status

Status only. Usage rules — families, weights, scale, icon conventions, the orange rule, portal mechanics, the full token and radius tables — are owned by [`design-system.md`](design-system.md).

**Typography — implemented.** Inter and JetBrains Mono are self-hosted variable webfonts via `@fontsource-variable`, imported at the top of `src/index.css` and bundled by Vite, so the offline PWA has them cached rather than falling back to `system-ui`. Inter is the app-wide non-code default; `--font-itera-sans` and the compatibility `--font-itera-display` token both alias `--font-sans`. (The `--font-itera-mono` alias was deleted — it had no consumers; code surfaces use `font-mono`.) **Gap:** the intended type scale is **not** wired into CSS vars — components use literal Tailwind utilities and match the scale by eye.

**Icons — implemented.** `lucide-react` remains the only icon library, at a single version. The small one-off SVG exceptions are the bracket motif and logo-derived watermark inside `SuggestedSessionHero.tsx`, plus `StreakFlameIcon.tsx`: one shared brand glyph added because Lucide's thin generic flame did not match the locked Progress reference at nav/KPI sizes.

**Tokens — implemented, light-only.** Two systems layer in `src/index.css`: the general tokens (`:root, [data-theme='light']`), and an additive `.itera-scope` namespace applied through `IteraSurface`. The Itera scope defines the locked `--itera-*` palette **and re-points the general tokens to Itera values inside the scope** — that re-pointing is the compatibility mechanism by which every pre-existing component reskins with zero edits, so do not "simplify" it away. There is no dark palette, and the unreachable `[data-theme='dark']` block plus the inert `dark` custom-variant have been deleted (see §4).

**Shared UI foundation — implemented:** `Button`, `Field`, `FloatingPanel`, `dialogs` in `src/components/ui/` (the v1 `FlipCard` is deleted; `reviewV2/components/FlipCard.tsx` is the only one); `RichText`/`InlineText`; `LazyCodeView`/`LazyCodeEditor`; `cn()` and `newId()` in `src/lib/`. Contracts and props are in [`design-system.md`](design-system.md) §3; the hand-built-on-purpose rule (no markdown, chart, graph or popover dependency) is in [`architecture.md`](architecture.md).

## 20. Visual-reference workflow

Reference mockups are **not tracked in this repository** — there is deliberately no `docs/references/` directory. They live at `C:\Users\SK\Desktop\itera-mockups\`, and [`design-system.md`](design-system.md) §14 defines the LOCKED / DIRECTION / CONCEPT tiers, the two standing exceptions, and the browser-verification requirement. Read it before implementing against any image.

## 21. Where the rest of the documentation lives

[`README.md`](README.md) is the index and states the source-of-truth hierarchy. In short: **the repository outranks every document**, this file outranks the reference docs on questions of status, and everything under [`archive/`](archive/) is history that never overrides a canonical doc.

## 22. TODO

- `supabase/migrations/0002_single_card_model.sql` needs running in the SQL editor. It's destructive by design and drops card_states before cards (that FK cascades).
- `supabase/migrations/0003_review_log_state_before.sql` needs running after 0002. It deliberately deletes prototype ReviewLog history before enforcing required `stateBefore`; no live Supabase project has verified it yet.
