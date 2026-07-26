# Current feature / page inventory

A snapshot of what exists today, route by route, and whether it's original (v1) or part of the in-progress Itera redesign. For the forward-looking roadmap (what's planned next), see [`docs/itera-redesign-plan.md`](itera-redesign-plan.md)'s phase table — this doc only describes present state.

**Status legend**
- **v1, unchanged** — original functionality, not touched by the redesign beyond an automatic color reskin (see below).
- **v1, reskinned only** — same as above, called out explicitly where it matters.
- **Itera redesign, production** — new-IA/new-visual-system work that's live on the real route.
- **Itera redesign, placeholder** — visually built and routed, but the content/logic behind it is illustrative, not real.

> Every route rendered through `AppShell` (all "v1" rows below) picks up Itera's colors automatically via `.itera-scope` — see [`docs/design-system.md`](design-system.md) §1. That's a **visual pass only**: data, structure, and behavior are otherwise unchanged from before the redesign started.

| Route | Component | What it does | Status |
|---|---|---|---|
| `/` | `TodayPage` (`src/features/today/`) | Home page: hero "suggested session" card, Momentum panel (streak/weekly goal/recall%), Continue Learning list, hand-rolled SVG pace chart. Has its own top-nav shell (`TodayShell`), not `AppShell`'s sidebar. | **Itera redesign, placeholder.** Built from a product-supplied mockup, shipped ahead of its formal roadmap slot. All numbers (streak, weekly sessions, recall %, milestone, Continue Learning rows, pace-chart series) are illustrative — no real streak/momentum/suggested-session logic exists yet. Replaces `DashboardPage` as `/`'s owner. |
| *(unrouted)* | `DashboardPage` (`src/features/dashboard/`) | The former `/` page — greeting, due/total/deck counts, quick actions. | **v1, orphaned.** Still fully functional, just not routed to. Reverting to it is a one-line router change. |
| `/decks` | `DecksPage` | Deck tree: create, nest to any depth, rename, delete, reparent, open. | **v1, reskinned only.** |
| `/decks/:id` | `DeckDetailPage` | A deck's cards as a list — drag-reorder, deck settings (rename/describe/reparent), per-card preview/edit/move/suspend/delete. | **v1, reskinned only.** |
| `/roadmaps`, `/roadmaps/:id` | `RoadmapsPage`, `RoadmapEditorPage`, `RoadmapCanvas` | Graphs of decks connected by directed edges to define a learning order; hand-built SVG canvas, no graph library. | **v1, explicitly deferred from the Itera MVP nav** (spec §36) — data/repo/Supabase table untouched. UI may be hidden/retired from nav later, not deleted (see `itera-decisions.md` D17). |
| `/review` | `ReviewPage` → `ReviewSessionV2` | The due queue: presents one card at a time via any of the 6 v2 interaction types (each v1 card lazily adapted through `migrateCard`), grades via FSRS, persists back onto `Card.scheduling`. | **Itera redesign, production.** Renders through the same shell (`ReviewSessionScreen`) as `/design-preview/review/*`. The old `ReviewSession.tsx`/`useReviewSession.ts` (v1) remain in the tree, unreferenced — see [`docs/architecture.md`](architecture.md#two-things-that-coexist-on-purpose-not-stale-code). |
| `/preview` | `PreviewPage` | Generic single-card preview (any v1 `CardType`) with no scheduling impact — answer/check or flip, jump to any card by number. | **v1, reskinned only.** |
| `/browse` | `BrowsePage` | Search/filter across all cards by text, tag, type, deck. | **v1, reskinned only.** |
| `/cards/new`, `/cards/:id/edit` | `CardEditorPage` | Create/edit a card of any of the 8 v1 types, per-type editor from the registry. | **v1, reskinned only.** The Itera Create/Edit rebuild (preset chooser + live production-preview pane) has not started. |
| `/drafts` | `DraftsPage` | Quick-capture inbox for raw notes, later converted into a full card (`seedContent.ts` seeds a starting shape per type). | **v1, reskinned only.** |
| `/stats` | `StatsPage` | Review-history stats/forecast (`computeStats.ts`): streak, retention, reviews/day, due-forecast. | **v1, reskinned only.** The Itera "Progress" rebuild (a dominant heat map, not equal stat boxes) has not started — still literally `StatsPage`. |
| `/settings` | `SettingsPage` + `CardStateMigrationSection` | Appearance (now a one-line note — theme toggle removed since Itera is light-only for now), Export/Import JSON backup, and a "Card scheduling migration (Phase D)" section to run the CardState dry-run/apply backfill. | **Mostly v1**, plus one Itera-only addition (the CardState migration section, deliberately kept v1-styled as an operational tool, not a user-facing feature). |
| `/design-preview/*` | `src/features/design-preview/**` | Chrome-free preview routes exercising the real, reusable v2 Review components against fixture data: `review/{recall,multiple-choice,write-code,ordering,matching,walkthrough}`. | **Itera redesign infrastructure.** A structurally separate top-level route array entry, not nested under `AppShell` — chrome-free by construction, not by hiding chrome with CSS. |
| `/design-preview/library`, `/design-preview/library-empty`, `/design-preview/library/:deckId` | `library-browser/`, `library-deck/`, `library-shared/` (all under `design-preview/`) | Library browser (Collection nav + Deck list, narrow widths collapse the nav into a drawer) and focused Deck page (Collection nav + Cards/Insights tabs) against hand-authored fixtures — Phase H's visual direction, checked ahead of the real Collection/Deck migration. `library-empty` renders the same browser against an empty fixture set. | **Itera redesign, placeholder/preview.** No real `Collection` type, no data migration, no Create/Edit — invented local fixture types only. Not linked from any real nav. See `itera-redesign-plan.md` Phase H and `itera-decisions.md` D55-D63. |
| *(no route — gates the whole app)* | `src/auth/{AuthGate,AuthProvider,LoginPage}` | Supabase magic-link sign-in, only active when cloud sync is configured (`isSupabaseConfigured`). Local mode has no login at all. | **v1, unchanged.** |

## Notable coexisting states (not bugs)

- **Two navigation shells.** Only `/` (Today) and `/review` currently have Itera-native chrome; every other route still uses the original 8-item left sidebar (`Sidebar`/`BottomNav`, driven by `src/components/layout/navItems.ts`), just recolored. This is an accepted, temporary tradeoff of shipping incrementally rather than swapping the whole-app shell in one move — see `itera-decisions.md` D45–D53.
- **`navItems.ts` still lists all 8 original items** (Today, Decks, Roadmaps, Review, Browse, Drafts, Stats, Settings) — the spec's real information architecture (horizontal top nav: Today/Library/Progress/Create, Settings under Profile) hasn't been built yet.
- **Card taxonomy is 8 types in production, 6 in the v2 content model.** Authoring (`/cards/new`, `/cards/:id/edit`) still works against the 8 v1 `CardType`s; Review renders through the 6 `InteractionType`s via lazy `migrateCard` adaptation. There is no v2 authoring UI.

For what's planned next (Library/Deck UI rebuild, the real global shell, Progress heat map, onboarding, responsive layouts, etc.), see the phase table in [`docs/itera-redesign-plan.md`](itera-redesign-plan.md) rather than duplicating it here — that file is the actively-maintained source of truth for the roadmap.
