# Current feature / page inventory

The canonical description of **what the product does and how it is meant to behave**, route by route, plus the behavior rules that apply across routes (Tip vs Explanation, study sessions, grading, account/login). It also states plainly what is **planned** and what is **explicitly out of scope**, so a planned feature is never mistaken for a shipped one.

Boundaries: for *implementation status detail* (real vs. placeholder numbers, known issues, next milestone) read [`CURRENT_STATE.md`](CURRENT_STATE.md); for *how it is built* read [`architecture.md`](architecture.md); for *how it should look* read [`design-system.md`](design-system.md); for *why* read [`itera-decisions.md`](itera-decisions.md).

**Status legend**
- **v1, unchanged** — original functionality, not touched by the redesign beyond an automatic color reskin (see below).
- **v1, reskinned only** — same as above, called out explicitly where it matters.
- **Itera redesign, production** — new-IA/new-visual-system work that's live on the real route.
- **Itera redesign, placeholder** — visually built and routed, but the content/logic behind it is illustrative, not real.

> Every route rendered through `AppShell` (all "v1" rows below) picks up Itera's colors automatically via `.itera-scope` — see [`docs/design-system.md`](design-system.md) §1. That's a **visual pass only**: data, structure, and behavior are otherwise unchanged from before the redesign started.

| Route | Component | What it does | Status |
|---|---|---|---|
| `/` | `TodayPage` (`src/features/today/`) | Home page: hero "suggested session" card, Momentum panel (streak/weekly goal/recall%), Continue Learning list, hand-rolled SVG pace chart. Renders through the shared `AppShell`/`TopNav` like every other standard route. | **Itera redesign, placeholder.** Built from a product-supplied mockup, shipped ahead of its formal roadmap slot. All numbers (streak, weekly sessions, recall %, milestone, Continue Learning rows, pace-chart series) are illustrative — no real streak/momentum/suggested-session logic exists yet. Replaces `DashboardPage` as `/`'s owner. |
| *(unrouted)* | `DashboardPage` (`src/features/dashboard/`) | The former `/` page — greeting, due/total/deck counts, quick actions. | **v1, orphaned.** Still fully functional, just not routed to. Reverting to it is a one-line router change. |
| `/decks` | `LibraryBrowserPage` (+ `LibraryCollectionView`) | The Library: Collection nav sidebar (UI-only tree over `Deck.parentId`), deck list with search/filter/sort, create/rename/delete. Selecting a Collection renders its identity view (rolled-up stats, its decks, any cards filed directly on it). | **Itera redesign, production.** Promoted from `design-preview/library-browser` onto real `useDecks`/`useSearchCards` data. `DecksPage` is unrouted but kept until parity is re-confirmed. |
| `/decks/:id` | `LibraryDeckPage` | A deck's cards as a table — Cards/Insights tabs, search/type/status/sort toolbar, drag-reorder (v1 subset, default view only), pagination once a filter/sort is applied, deck settings. | **Itera redesign, production.** One `CardTable` renders both v1 `Card` and `CardV2Record` rows. **Clicking a row opens the card in preview** (`/preview?card=…` for v1, `/cards/:id/study` for v2); Edit/Duplicate/Move/Suspend/Delete live in the row's kebab menu — see `itera-decisions.md` D113. There is no separate read-only detail screen. |
| `/roadmaps`, `/roadmaps/:id` | `RoadmapsPage`, `RoadmapEditorPage`, `RoadmapCanvas` | Graphs of decks connected by directed edges to define a learning order; hand-built SVG canvas, no graph library. | **v1, explicitly deferred from the Itera MVP nav** (spec §36) — data/repo/Supabase table untouched. UI may be hidden/retired from nav later, not deleted (see `itera-decisions.md` D17). |
| `/review` | `ReviewPage` → `ReviewSessionV2` | The due queue: presents one card at a time via any of the 6 v2 interaction types (each v1 card lazily adapted through `migrateCard`), grades via FSRS, persists back onto `Card.scheduling`. | **Itera redesign, production.** Renders through the same shell (`ReviewSessionScreen`) as `/design-preview/review/*`. The old `ReviewSession.tsx`/`useReviewSession.ts` (v1) remain in the tree, unreferenced — see [`docs/architecture.md`](architecture.md#two-things-that-coexist-on-purpose-not-stale-code). |
| `/preview` | `PreviewPage` | Flip through a deck's cards (or one card, from Browse) with no scheduling impact: back link, tag row, "Card N of M" jump input, prev/next, arrow keys. The card itself is the real Review experience — `migrateCard` + `ReviewSessionScreen` with its session chrome hidden — the same path `/review` takes. | **Itera redesign, production.** Page chrome is still v1-styled; the card is not (see `itera-decisions.md` D128). |
| `/browse` | `BrowsePage` | Search/filter across all cards by text, tag, type, deck. | **v1, reskinned only.** |
| `/cards/new` | `CardEditorPage` | Create a card of any of the 8 v1 types, per-type editor from the registry. | **v1, reskinned only.** Unreferenced by any Itera-native entry point now (Deck page's "New card" points at the route below) but left in place — nothing else has moved off it. |
| `/decks/:deckId/cards/new` | `CardCreatePage` → `CardTypeChooser` / one `*EditorShell` per type | Itera Create/Edit (Phase F): a six-tile interaction chooser, all six enabled, then a per-type editor+live-preview shell — the preview pane is the *actual* production `ReviewSessionScreen`/interaction component, not a mockup. Saves a real, persisted `CardV2Record` (its own repository/Dexie table/Supabase table, independent of `Card`/`CardState`). | **Itera redesign, production.** All six interaction types (Recall, Multiple Choice, Write Code, Ordering, Matching, Walkthrough) are wired up — Phase F's Create/Edit is complete. |
| `/cards/:id/edit` | `CardEditEntry` | Branches per card: a `CardV2Record` opens its matching editor shell directly by interaction type; a legacy v1 `basic`/`codeReading`/`bugFinding` card opens `RecallEditorShell`, a legacy v1 `mcq` card opens `MultipleChoiceEditorShell`, a legacy v1 `codeCompletion` card opens `WriteCodeEditorShell`, a legacy v1 `ordering`/`matching` card opens the matching v2 editor, and a legacy v1 `story` card opens `WalkthroughEditorShell` (editing any of these migrates it to a `CardV2Record` on save — the "legacy cutover"); any other v1 type falls through to the untouched `CardEditorPage`. | **Itera redesign, production**, coexisting with v1 by design. |
| `/cards/:id/study` | `CardStudyPreviewPage` | The Deck row's primary click target: the real Review experience for the card's actual interaction type, against a fresh scheduling baseline — nothing is persisted. Also the closest thing to a "Card detail" view, per `itera-decisions.md` D69. | **Itera redesign, production**, non-committing preview only. |
| `/drafts` | `DraftsPage` | Quick-capture inbox for raw notes, later converted into a full card (`seedContent.ts` seeds a starting shape per type). | **v1, reskinned only.** |
| `/progress` | `ProgressPage` (`src/features/progress/`) | The real Itera Progress page (mockup-driven): a local sidebar (only "Overview" is live, the rest are disabled "Soon" rows), 5 KPI tiles with period-over-period deltas, an activity heat map (own 7D/30D/3M/1Y toggle), a retention-over-time chart (deck-scopable), a deck-performance table, and a derived recent-milestones panel — all computed from real `ReviewLog`/`Card`/`Deck` data via `src/domain/stats/{dateRange,progressMetrics}.ts`. Primary nav's "Progress" link now points here. | **Itera redesign, production.** See `itera-decisions.md`'s 2026-07-28 entry for exactly what's real vs. derived (e.g. "sessions" are gap-clustered from review timestamps, not a persisted entity) and what was scoped out (Decks/Activity/Review lag/Milestones/Achievements/Stats/Reports sub-pages, an "Itera Pro" upsell). |
| `/stats` | `StatsPage` | Review-history stats/forecast (`computeStats.ts`): streak, retention, reviews/day, due-forecast. | **v1, reskinned only.** Superseded by `/progress` in primary nav but left mounted, untouched, as a direct-URL safety net — not deleted. |
| `/settings`, `/settings/:section` | `AccountSettingsPage` (`src/features/settings/`) + `SettingsNav` + `sections/*` | The full Account settings page the avatar menu opens, mockup-driven: a local section nav (Profile · Email & password · Appearance · Notifications · Privacy · Connected devices — divider — Import / Export · Card scheduling) beside the active section. Only two sections are real — **Import / Export** (the JSON backup, moved here verbatim from the old `SettingsPage`, now confirming through `useDialogs` instead of `window.confirm`) and **Card scheduling** (the Phase D `CardStateMigrationSection` dry-run/apply backfill). Every other section, including the Profile form/statistics/danger zone, is an inert greyed placeholder that states what it will hold. Billing and Plan & usage from the mockup were dropped outright — there is no billing concept in this product. Unknown or missing `:section` falls back to Profile. | **Itera redesign, production**, with the two pre-existing working features carried over unchanged. `SettingsPage.tsx` was deleted, not left unrouted, since its content moved wholesale. |
| `/design-preview/*` | `src/features/design-preview/**` | Chrome-free preview routes exercising the real, reusable v2 Review components against fixture data: `review/{recall,multiple-choice,write-code,ordering,matching,walkthrough}`. | **Itera redesign infrastructure.** A structurally separate top-level route array entry, not nested under `AppShell` — chrome-free by construction, not by hiding chrome with CSS. |
| `/design-preview/library`, `/design-preview/library-empty`, `/design-preview/library/:deckId` | `library-browser/`, `library-deck/`, `library-shared/` (all under `design-preview/`) | Library browser (Collection nav + Deck list, narrow widths collapse the nav into a drawer) and focused Deck page (Collection nav + Cards/Insights tabs) against hand-authored fixtures — Phase H's visual direction, checked ahead of the real Collection/Deck migration. `library-empty` renders the same browser against an empty fixture set. | **Itera redesign, placeholder/preview.** No real `Collection` type, no data migration, no Create/Edit — invented local fixture types only. Not linked from any real nav. See `itera-decisions.md` D55-D63. |
| `/login` | `LoginPage` (`src/features/login/`) | The sign-in page, built to the `login-v3.png` mockup: a single restrained surface split into a product half (real Itera mark, "Welcome back", a three-card CSS learning-card illustration, and Local-first / Private by default / Built for engineers) and a sign-in panel (email, password with a show/hide toggle, Remember me, Sign in, and Continue with demo workspace). Chrome-free by construction — a top-level route with no `AppShell` ancestor, and outside `RequireAuth`. | **Itera redesign, production shell over dummy local auth.** In local mode the password is never stored, sent, or verified: signing in mints a `LocalSession` (`src/auth/localSession.ts`). When Supabase is configured the password field and Remember me are hidden and Sign in sends the existing magic link. Forgot password is a deliberate `aria-disabled` placeholder — no reset backend exists. |
| *(no route — the guard)* | `src/auth/{RequireAuth,AuthProvider,AuthGate,localSession}` | `RequireAuth` is one pathless layout route wrapping every product route (the whole `AppShell` tree plus `/review`); signed-out visitors are redirected to `/login` carrying the route they wanted. `/login` and `/design-preview/*` sit outside it. `AuthProvider` treats a Supabase session **or** a local session as signed in; `AuthGate` now only waits for the Supabase bootstrap. | **Itera redesign, production.** Local mode is gated now — it previously had no login at all. `localStorage`/`sessionStorage` (Remember me picks which) is touched in exactly one file. |

## Notable coexisting states (not bugs)

- **One navigation shell.** Since the App Shell convergence milestone every standard route renders through `AppShell` → `TopNav` (Today · Library · Progress), and `/review`, `/login` and `/design-preview/*` are chrome-free top-level routes by construction. `Sidebar.tsx`/`BottomNav.tsx`/`navItems.ts`/`PageHeaderOverride.tsx`/`TodayShell.tsx` were deleted. (Earlier revisions of this doc described two coexisting shells — that tradeoff no longer applies.)
- **Four routes are mounted but unlinked from any nav**: `/browse`, `/drafts`, `/cards/new` (superseded by the v2 create flow) and `/stats` (superseded by `/progress`). Direct URL only, pending an entry-point decision — see [`CURRENT_STATE.md`](CURRENT_STATE.md) §15.
- **Card taxonomy is 8 types in production, 6 in the v2 content model.** Phase F is complete: **all six** v2 interactions (Recall, Multiple Choice, Write Code, Ordering, Matching, Walkthrough) have real editors, and cards created there — plus any legacy v1 card edited through the new flow — are persisted as `CardV2Record`s, a real store independent of `Card`/`CardState`. The v1 registry editor (`/cards/new`) still exists for the v1 `CardType` union and is unreferenced by any Itera-native entry point. Review renders both through the 6 `InteractionType`s — v1 cards via lazy `migrateCard` adaptation, `CardV2Record`s directly — but `CardV2Record`s are **not yet in the global due queue** (`useDueCards`/`ReviewPage` only reads v1 `cards`); they can only be reviewed non-committingly (editor preview, "Study this Card") until that integration is built.

---

## Cross-cutting product behavior

These rules apply to every card and every session, regardless of route.

### Card interactions (the six v2 types) — implemented

| Interaction | What it drills | Response | Grading |
|---|---|---|---|
| **Recall** | Free-form recall, code reading, find-the-bug, predict-output, explain-code (one interaction, differentiated by an authoring preset) | Flip to reveal | Self-graded |
| **Multiple Choice** | Single- or multi-correct selection | Select option(s), submit | Exact-set: correct only if every correct option is selected and no incorrect one is |
| **Write Code** | Producing the right code | Type into a code editor | Line-ending normalization + outer trim + per-line trailing-whitespace trim against accepted answers |
| **Ordering** | Correct sequence | Drag, **or** keyboard Move up/down | Position-wise (an item counts only at its authored index), with partial-credit score |
| **Matching** | Associating concepts across up to three columns | Assign values across a connected board | Partial credit per cell; a shared column lets one value serve several terms |
| **Walkthrough** | Multi-step scenarios (tracing execution, staged reasoning) | Walk the steps, each with its own response type | Per step, dispatched by that step's response type; partial credit |

**Grading model — LOCKED.** Objective correctness and recall quality are different things. A correct answer does not automatically mean *Good*; an incorrect one does not automatically mean *Again*. **The learner always chooses the final rating.** The app may pre-select a recommendation after auto-grading, but that recommendation must stay overridable. For automatically validated cards, the **first** submitted response is the scored one — inspecting or experimenting afterward does not change what was recorded.

**Review flow — LOCKED.** Strictly two-phase: **Question → reveal/submit → Answer → one FSRS rating.** Even Walkthrough, which is internally multi-step, produces exactly **one card-level FSRS rating** at the end; the grade bar stays locked until the last step.

### Tip vs Explanation — LOCKED

Two distinct optional fields; do not merge them or use one for the other's job.

| | **Tip** | **Explanation** |
|---|---|---|
| Purpose | Helps the learner *reach* the answer | Adds context *after* the answer |
| When | Before reveal/submission | After reveal/submission, **before** the rating controls |
| Where | Directly below the active card, easy to find | Below the card, separate from the answer itself |
| Collapsible | May be collapsed by the learner, but **never** hidden away in a side panel | — |

Tip is a genuinely new field: **no pre-existing content was auto-assigned into it** when v1 cards were mapped to v2, with one exception — v1's `bugFinding.bugHint`, which already was a pre-answer hint.

### Study sessions

A study session is **temporary and generated**, not a persisted entity: sources include all due cards, one deck, or a deck scope passed as `?deck=`. The queue is snapshotted so grading does not reshuffle it mid-session, and undo is available for the last grade.

**Not implemented:** the `StudySession` type exists in `src/types/cardV2.ts` but nothing constructs or stores one, so there is no session goal (card count / target minutes), no session id on history rows, and no resumable session. Progress's "sessions" are **gap-clustered from review timestamps** for display purposes, not read from a session record.

### Account and login — implemented

Signing in is real and gates the whole product: `/login` mints either a Supabase session (magic-link OTP) or a local `LocalSession`, and every product route sits behind one guard. **In local mode the password is a dev/demo shell — never stored, sent or verified**, and "Continue with demo workspace" is a first-class way in. There is no password authentication and no password reset anywhere in the product; "Forgot password" is a deliberate `aria-disabled` placeholder. Signing out is available from the account menu whenever any session exists.

---

## Planned (specified, not built)

Do not describe any of these as shipped, and do not build against them as though they exist.

| Feature | State |
|---|---|
| **`CardV2Record`s in the real due queue** | The single most consequential gap: cards authored in the v2 create flow can only be reviewed non-committingly. `repo.cardsV2.getDue()` is implemented in both backends and has no caller. This is the recommended next milestone — see [`CURRENT_STATE.md`](CURRENT_STATE.md) §17. |
| **Real Today product logic** | Streak, weekly goal, recall %, milestones, Continue Learning rows and the pace chart are illustrative constants. No suggested-session algorithm, streak tracking, or goal concept exists. "Adjust session" has no behavior. |
| **Collection as a real entity** | "Collection" is derived in the UI from `Deck.parentId`. There is no `Collection` type, table or migration — see [`itera-migration-plan.md`](itera-migration-plan.md) §6. |
| **Onboarding and full empty-state coverage** | No onboarding flow exists. Empty states exist for Library and Progress; the full audited set does not. |
| **Progress sub-pages** | Decks, Activity, Review lag, Milestones, Achievements, Stats, Reports are `aria-disabled` "Soon" rows. Only Overview is live. |
| **Settings sections** | Profile, Email & password, Appearance, Notifications, Privacy, Connected devices are inert placeholders. Only Import/Export and Card scheduling are real. |
| **Mobile navigation pattern** | The shared top nav simply scrolls horizontally; no dedicated mobile navigation exists. Matching's stepwise mobile pairing flow is likewise unbuilt. |
| **Dark mode** | Deferred. `.itera-scope` has no dark palette; `ThemeProvider`/`useTheme`/`ThemeToggle` are intact and unrendered, so this is reversible the moment a dark palette is designed. |
| **Media in cards** | Not developed. When it arrives it must store local asset ids (never fragile absolute paths), be referenced from `RichContent`, be included in export archives, and work offline. |

## Explicitly out of scope

Deliberately **not** built during this redesign. The architecture should not block them, but nothing should prebuild them either.

Marketplace · payments · deck publishing and version updates · collaborative deck editing · AI generation or grading at runtime · semantic code equivalence · code compilation or execution · a debug-simulation card type · compact power-user density · rich media authoring beyond basic local support.

**Roadmaps** is a special case: it is a real, working, shipped feature (`/roadmaps`, `/roadmaps/:id`) that is deliberately **excluded from the redesigned navigation** and receives no new development. Its data — the `Roadmap` type, both backends' repo methods, the Supabase table, backup inclusion — is preserved. Hiding the UI is allowed; **deleting the data requires separate explicit approval** and is not scheduled.

**Cloud sync/accounts** was listed as deferred in the original spec but is partly real: Supabase sync with magic-link auth predates the redesign and still works, and a session boundary now gates the app in both modes.
