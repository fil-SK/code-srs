# Itera — current repository state

**Last verified against the working tree: 2026-08-27** (branch `mvp_demo_cleaning`).

> **Canonical Demo Repository convergence (milestone M-PARITY-1A, §31).** The
> mobile Demo runtime now uses the same Repository-backed Deck/Card/ReviewLog
> architecture as the rest of Itera: a mobile-owned `InMemoryRepository`
> registered through the shared `configureRepository()`, screens reading through
> the shared query hooks, Review writing through `commitReview`/`revertReview`,
> and Collections derived from canonical `Deck.parentId` through core's
> `collectionTree` rather than a parallel mobile collection model. **No
> authoring UI was added and nothing learner-visible was meant to change.**
>
> **Mobile authoring parity is now underway (milestone M-PARITY-1B, §32).**
> Deck create, edit and delete work in Demo mode, as do Recall and Multiple
> Choice create, edit and delete, all bound to the shared form models,
> validators and `saveXCard` paths - **no native save logic exists**. The
> remaining four card editors (Write Code, Ordering, Matching, Walkthrough) are
> not implemented, and no control offers one; cards of those types study and
> review normally. Two genuine product rules were extracted into core in the
> same pass - `validateDeckForm` and the deck deletion guard `checkDeckDeletion`
> - and web now calls both with its rendered behaviour unchanged.
>
> **Demo authoring remains in memory.** Authored decks and cards live in the
> `InMemoryRepository` for the life of the process and are discarded by Reset
> Demo and by a full app restart, by decision. **Cloud remains deferred until
> after market validation** (D416's surviving half). Physical-device
> verification of M-PARITY-1A and M-PARITY-1B is pending the owner.


> **Mobile notification-state refinement (§30).** Read notifications now use a
> light neutral treatment instead of a compounded gray card plus gray overlay.
> Every row exposes a separate 44-point Read/Unread status action, so either
> state can be set without opening or navigating away from the notification.
> Opening an unread row still marks it read and follows its honest destination.

> **Expo Go startup hotfix (§29).** Physical-device testing found that Expo Go
> does not expose Web Crypto on `globalThis`, so the demo crashed while its seed
> ReviewLogs called core's `newId()`. The mobile app now installs SDK 54's
> `expo-crypto` through a custom entry point before Expo Router evaluates any
> route. The missing-global regression, full suites, typechecks, lint and the
> iOS/Hermes export are clean. Re-verification in Expo Go after clearing Metro's
> cache is pending the owner and is not claimed.

> **Market-validation checkpoint (milestone M-DEMO-5, §28).** `apps/mobile` is now being prepared as a **bounded, deterministic market-demo**: something to record, demonstrate and put in front of prospective users. The rule applied across every learner-facing surface is that a visible affordance must be functional, intentionally and clearly unavailable, or removed - there is no state where a control looks enabled and does nothing. Eleven prototype controls left over from the mockup phase were **removed rather than disabled**, because none was pending work.
>
> Two things were deferred by **product decision** at that milestone, not as technical debt. **Mobile card and deck authoring was deferred** - superseded on 2026-08-27 by D421 after physical-device testing, and now the subject of M-PARITY-1B (§17, §31). **Cloud/Supabase remains deferred** until after market validation, and demo persistence with it; that half is unchanged.

> **`apps/mobile` now defaults to an explicit, deterministic Demo mode (milestone M-DEMO-1, §24).** Market validation takes precedence over live cloud integration by product-owner decision: the app opens with no Supabase credentials, over one coherent demo workspace, so it can be shown to potential users. Demo data is **not production persistence** - it is deterministic demo data, never synced or cloud-backed, and it resets on a full app restart by design. Library navigation, search, filter and sort are functional over that workspace.
>
> **Demo Review is now a functional local study session (milestone M-DEMO-2, §25).** All six interaction types are reviewable on the phone over the same demo workspace, through a native RichText renderer over the shared parser and the shared `InteractionBehavior` / grading / FSRS layer. The learner still chooses every final rating. The resulting `SchedulingState` and canonical `ReviewLog` are held **in memory** in the demo workspace and reset on a full app restart, by decision - **cloud persistence remains deferred until after market validation**. The native malicious-content regression is complete, so the standing native-renderer security item is closed.

> **Today and Progress now react to that history (milestone M-DEMO-3, §26).** A modest deterministic ReviewLog history is materialized relative to the current local day, and every learning metric on those screens is derived from canonical Cards + ReviewLogs through `@itera/core`: Due, Learned, Reviews, mature Retention, Current streak, duration estimate, Continue Learning, the activity map, the gap-aware retention series, deck performance and milestones. A grade, completion Undo and the development reset propagate across Today, Progress and Library immediately. The state remains demo/local and in memory; nothing is synced, cloud-backed or persisted.
>
> **Milestone M1A - the native cloud/auth/data foundation (§23) - remains implemented and intact, and remains unverified.** It has never been run against a live Supabase project, because none exists (see §15), and Supabase integration is **intentionally postponed until after demand validation**. Cloud mode is still reachable with `EXPO_PUBLIC_ITERA_MODE=cloud` and valid configuration; everything in §23 marked *pending live verification* is code-complete and gate-clean but unproven against real Postgres.

The most recent product-correctness milestone completed **Progress correctness and KPI definitions** (Milestone 3): every new `ReviewLog` records the scheduling state before grading, mature retention uses that field through one shared calculation, Progress's headline row is exactly **Learned · Due · Reviews · Retention · Current streak**, and Deck Performance now ranks actionable due work. Prototype ReviewLog history was deliberately discarded rather than reconstructed: Dexie version 2 clears only `reviewLogs`, the versioned Supabase migration deletes the same rows before enforcing the new JSON contract, and backup import rejects any nonconforming row. Cards and decks remain intact. See the 2026-08-21 entry in [`itera-decisions.md`](itera-decisions.md).

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

**Structural: `@itera/core` owns the platform-neutral engine; Phase 2 owns the stable web workspace; Phase 3.0 established the device-confirmed native bootstrap; Today, Profile & Settings, Notifications, Progress, all three Library navigation depths, and all six interaction previews are now native presentations under iterative device review.** `apps/mobile` now has a real composition root, and its product screens remain fixture-backed: Today, Notifications, Progress, Library and interaction previews, plus a Profile & Settings screen that is presentation-only apart from real account identity and Sign out, behind a five-item Expo Router shell (`Library · Review · Today · Progress · Profile`) that now sits inside an authenticated route group. Ordinary sections retain the tab bar; Notifications and Review previews deliberately use immersive nested routes and hide it. These screens consume shared Itera tokens and existing `Card`/`Deck`/Collection/progress/interaction semantics without copying repository or domain behavior. Mobile authentication, repository composition and TanStack Query are connected (§23) but are the **cloud** path, which is deferred and unverified; the default build now runs in Demo mode over one deterministic demo workspace, where Library/Today/Progress/Notifications navigation, search, filter and sort are functional (§24), and where **Review is now a real local study session across all six interaction types** over shared behavior, grading and FSRS, with in-memory scheduling and canonical ReviewLogs (§25). Real mobile product data, cloud review persistence, sync, push registration and reminder scheduling are not. **No persisted shape or web product behavior changed.**

### Web + mobile convergence checkpoint

The Phase 0 architecture and migration roadmap exists at [`mobile_app_conversion/master_plan.md`](mobile_app_conversion/master_plan.md). **Phase 1 shared-core extraction is complete, and Phase 2 web-workspace relocation is complete.** The repository now has four clear boundaries:

- the root is workspace orchestration only;
- `apps/web` is the stable production web app;
- `packages/core` is the shared product, domain, data, auth, content and interaction engine;
- `apps/mobile` is the Expo SDK 54 / React Native presentation and composition workspace; Today, Notifications, Progress, Profile & Settings, Library's All Decks/Collection/Deck depths and a working Review session across all six interactions now have native presentations. Notifications is a local inbox preview rather than OS push functionality, and Review is a **demo/local** session over in-memory state rather than a repository-backed one.

The current project checkpoint is: **the demo Review session is functional across all six interaction types (§25).** The Review tab lands on a small start screen at `/review` and the session itself is one immersive route, `/review/session`, that dispatches on `card.interaction.type` through a native registry; the five per-type preview routes and their fixtures are deleted. A native RichText renderer over the shared parser now renders real card content, so the session runs over the demo workspace's real `Card`s rather than hand-tokenized fixtures. Readiness, objective grading, semantic width, FSRS scheduling and `ReviewLog` construction all come from `@itera/core`; the resulting scheduling state and logs are held in memory in the demo workspace. The native malicious-content regression is complete and the native-renderer security TODO is closed. **Review capability parity is demo/local, not cloud-complete:** there is no `Repository` write, no transactional `commitReview` and no persist-failure retry, and none of it survives an app restart.

> Web and native must share product semantics, but render platform-appropriate UIs.

The following must remain single shared implementations rather than being copied into mobile:

- `Card` / `ReviewLog` contracts;
- FSRS and scheduling;
- grading;
- review persistence semantics;
- retention, streak and calendar logic;
- `Repository` and query semantics;
- auth policy;
- RichText and content semantics;
- interaction behavior.

### Content-security handoff

The web RichText/content rendering path has received a focused malicious-content and stored-XSS audit; no stored-XSS execution defect remained. The Walkthrough remote-image/network-beacon defect found by that pass was fixed with the shared `isSafeImageSource` allowlist. **The handoff is complete.** A native content renderer now exists and has had its own equivalent pass (§25): core's `attackPayloads.ts` driven through it at block, inline and fenced-block level; the native sinks that actually exist on this platform (`Linking`, `WebView`, `Image` source URIs, style values, dynamic modules) enumerated and either absent, scanned for, or gated by the same shared `isSafeImageSource`. No native defect was found, and the `TODO.md` item that held this open is closed.

**Milestone reached: "Progress correctness & KPI definitions" (2026-08-21), on top of "Make Today real", "MVP integrity cleanup" and "Single card model".**

A temporal end-to-end QA pass on 2026-08-21 (import → review → real FSRS persistence → controlled calendar-time advance → due queries → Today → Progress → Review history) returned **PASS WITH ISSUES** with no correctness blocker; its evidence is kept in [`qa_report_21_aug_2026/`](qa_report_21_aug_2026/qa_report_21_8_2026.md). All three findings were closed on 2026-08-22 without new product scope: isolated retention buckets now render as points, streak copy is grammatically correct, and `newId()` no longer assumes a secure context. The phone-width observation in that report did not reproduce as a persistent overflow.

A release-readiness audit on 2026-08-22 ([`audits/audit_22_8_2026.md`](audits/audit_22_8_2026.md)) reproduced a P1 data-loss path in replace-mode import: a file that passed preflight cleared all five stores and then failed mid-write, destroying the prior workspace. **P1-1 is fixed** — every backup array is now validated element-by-element before any write, and the local backend performs replace and merge inside a single Dexie transaction, so a failed import leaves the previous workspace exactly as it was (§12, §15, and the 2026-08-22 decision entry). **P1-2 is fixed** — the same audit reproduced ten consecutive local study days across the 2026-10-25 DST transition reporting a 4-day streak, because local-day statistics stepped days by a fixed 86,400,000 ms. All local calendar-day arithmetic now goes through `packages/core/src/domain/stats/calendarDay.ts`, so streaks, the Today pace series, the activity heat map, milestones, date ranges and the Today/Yesterday labels are DST-safe (§9, and the second 2026-08-22 decision entry). Nothing persisted changed: review and due timestamps were always absolute epoch millis, so the correction is retroactive. **P1-3 is fixed** — the same audit found that `isAuthenticated` was `session !== null || local !== null`, which never consulted `isSupabaseConfigured`, so an origin that later gained `VITE_SUPABASE_*` admitted every returning visitor on a stale `itera.session` into a Supabase-backed app with no Supabase user: empty reads, failing writes, `/login` unreachable because it redirected away, and an account menu claiming the data was "Stored in this browser". Authentication now follows the backend mode (§5, §6, and the third 2026-08-22 decision entry). **P1-4 is fixed** — the same audit found that every collection read in `SupabaseRepository` issued one unbounded `select` with no `.range()` and no follow-up page, while a Supabase project caps each response at its API **Max rows** setting and signals it only in a header. A cloud-mode workspace larger than that cap therefore produced short reads with a 200 and no error, the worst case being an `exportBackup()` that wrote a normal-looking but incomplete file. Every collection read now pages to completion under a deterministic order (§12, and the fourth 2026-08-22 decision entry). **All four P1 findings are closed.**

The P2 hardening that followed closed the audit's remaining ranked items in two passes. P2-A took §10 items 3, 4, 7, 8, 9 and 11 (Supabase bootstrap rejection, PWA precache, collection cycles, download compatibility, dialog focus, `schema.sql` re-runnability). **P2-B closes §10 items 5 and 6 — review persistence.** Grading wrote the advanced card and its ReviewLog as two independent operations, so a failure between them left a card scheduled forward with no history row: permanently invisible to Progress, retention, streak and the heat map, which all derive from the logs. A rejection was also dropped on the floor — the phase had already advanced past grading and the ratings were disabled, so the session sat frozen with no explanation. Both are fixed: the seam now carries `commitReview`/`revertReview`, each backend writes both stores as one transaction, and a failed write shows an inline retry that re-sends the same computed result rather than grading again (§11, §12, §15, and the newest 2026-08-22 decision entry). **Every P1 and every ranked P2 audit item is now closed.**

Progress now answers five explicit questions with five honest tiles: unique current active cards learned, cards due now, ReviewLog entries in the selected period, mature retention in that period, and the canonical current streak. `stateBefore` is required on every new ReviewLog, so new/learning graduations never contaminate mature retention and a Review → Again remains an eligible failure. The page retains its heat map, deck-scopable retention chart and milestones; gaps in the retention chart are no longer interpolated. Deck Performance shows leaf/actionable decks with Learned, Due and Retention, including due decks with no period history, ordered around due work. No page was redesigned.

Today's placeholder content is gone. The hero reads the real due queue (count, contributing deck names, and a duration estimated from the learner's own review history); Momentum is four real rows (Current streak, Retention, Due today, Next milestone); Continue Learning lists real decks with real due counts and deck-scoped links; the pace chart plots real reviews-per-day; and the page has honest new-user and caught-up states. Weekly Goal was **removed rather than computed** — no goal concept exists. `Adjust session` is a working dialog (deck scope + card count, nothing persisted), and the Review queue is a per-mount snapshot.


The integrity pass removed the MVP-adjacent surfaces that were telling the user something untrue: the AI card-generation prompt now emits the real v2 single-card import contract instead of the deleted 8-type schema; imported backups are validated structurally (and referentially, per import mode) before anything is written; the account menu's Spaced repetition row no longer navigates to a non-existent settings section; the fabricated "Your name" identity line is gone; and the Library empty state no longer promises an automatic Inbox deck. No page was redesigned and no new feature system was added.

The redesign has converged *and* the retreat is finished. Previously the redesign was complete but the pages it replaced were still mounted-but-unlinked, so a user could reach a pre-redesign screen by URL and two redesigned pages still linked into them. Those pages, their entire transitive closure, and the `/design-preview` Library fork are now gone: 78 production files and 7 test files, leaving exactly one implementation of every surface.

What is real: one shared Itera app shell, one Library/Deck implementation, one Review surface, one flip primitive, **one card model**, one card store, one hook family, all six authoring editors, a semantically correct Progress page with real Review history, a real Account settings page, and a real auth gate in front of everything. Every card authored in any of the six editors is immediately schedulable in `/review`. The primary functional MVP and the Phase 1/2 convergence foundation are complete; work is now deliberately stopped at mobile GUI design before Phase 3 native implementation. The Collection/Deck migration and the reskinned-only Roadmaps surface remain later structural/product candidates, not blockers for this checkpoint.

Recent milestone sequence (newest first): Progress correctness & KPI definitions → Today made real → MVP integrity cleanup → single card model → Review history → v1 legacy surface deleted → Progress iconography → Login visual refinement → Login + session boundary → Account menu + Account settings → Ordering card redesign → Library row/preview fixes → Matching board (3 columns) → Progress page → Library polish → flashcard/Library redesign → App Shell and Visual Foundation Convergence.

---

## 2. Implemented primary pages

Real data, real behavior, production-routed:

| Page | Route | Component |
|---|---|---|
| Library browser | `/decks` | `apps/web/src/features/library/LibraryBrowserPage.tsx` |
| Collection identity view | `/decks?collection=…` (same route) | `apps/web/src/features/library/LibraryCollectionView.tsx` |
| Focused Deck page | `/decks/:id` | `apps/web/src/features/library/LibraryDeckPage.tsx` |
| Review session | `/review` | `apps/web/src/features/review/ReviewPage.tsx` → `ReviewSessionV2` → `reviewV2/ReviewSessionScreen` |
| Card create | `/decks/:deckId/cards/new` | `apps/web/src/features/cards/CardCreatePage.tsx` |
| Card edit | `/cards/:id/edit` | `apps/web/src/features/cards/CardEditEntry.tsx` |
| Card study preview (non-committing) | `/cards/:id/study` | `apps/web/src/features/cards/CardStudyPreviewPage.tsx` |
| Progress | `/progress` | `apps/web/src/features/progress/ProgressPage.tsx` |
| Review history | `/progress/history` | `apps/web/src/features/progress/ReviewHistoryPage.tsx` |
| Account settings | `/settings`, `/settings/:section` | `apps/web/src/features/settings/AccountSettingsPage.tsx` |
| Login | `/login` | `apps/web/src/features/login/LoginPage.tsx` |
| Deck/card preview flip-through | `/preview` | `apps/web/src/features/preview/PreviewPage.tsx` |

## 3. Partially implemented pages

| Page | What is real | What is placeholder |
|---|---|---|
| **Today** (`/`, `apps/web/src/features/today/`) | **Everything.** Due count, contributing deck names and the duration estimate in the hero; current streak; corrected mature retention; due today; the derived Next milestone; Continue Learning rows; the seven-day pace series; the Adjust session dialog; and the new-user / caught-up / loading states. All computed in `packages/core/src/domain/stats/{todayMetrics,streak,learned,deckMetrics,progressMetrics}.ts` — `TodayPage` is the only fetcher and the four panels are presentational. | Nothing on the page is fabricated. **Deliberately deferred, not faked:** Weekly Goal (removed — no goal concept exists), a richer milestone/achievement system (the row is a derived deck continuation, not an entity), and advanced session controls (time-boxed, weak-cards, new-vs-review, difficulty/interaction/tag filters, custom FSRS). Continue Learning lists leaf decks only, so cards filed directly on a deck-with-children get no row (they are still counted in the hero and Due today). |
| **Mobile Today** (`/today`, `apps/mobile/src/components/today/`) | Owner-approved native composition: Itera header, shared greeting behavior, stacked hero, Due today / Current streak / Retention / Est. session metrics, Start CTA, Continue Learning rows, scrolling, safe-area handling, and the persistent five-item tab shell with a raised center Today control. **Each Continue Learning row opens its own deck**, and the header bell's unread dot reflects the real demo unread count. The hero's one action switches to **Browse your library** when nothing is due (§28), and Continue Learning states when nothing is in progress. There is no Adjust session control on mobile. | Demo/local (§26, §31): Due, streak, mature Retention, session estimate and Continue Learning are derived from current Cards + ReviewLogs through shared core functions, read through the shared query hooks over the demo `InMemoryRepository`, and react after Review/Undo/reset. No sync and no persistence is involved. |
| **Mobile Profile & Settings** (`/profile`, `apps/mobile/src/components/profile/`) | **In demo mode the screen is the Itera header, the workspace identity card and the `__DEV__` rows, and nothing else (§28).** It says "Demo workspace", that the data is deterministic and not a synced account, and that nothing is saved between launches; the Sign-out row is absent, because there is no account to sign out of. **In cloud mode the owner-approved structure is unchanged**: the seven selectable settings rows, the six section detail panels, the Import / Export panel, the real session email and a live Sign out. | Nothing is fabricated in either mode. Demo mode no longer advertises the six unbuilt settings sections or a backup this platform cannot perform - six could only say "not available yet", and Import / Export's Merge/Replace radio responded to every press while the buttons above it could not run. Physical-device review of demo mode is pending. |
| **Mobile Library — All Decks + Collection + Deck** (`/library`, `/library/:collectionId`, `/library/deck/:deckId`, `apps/mobile/src/components/library/`) | Three explicitly separate native depths in one nested Library stack, now **navigable end to end over the demo workspace** (§24). Every All Decks row opens its own deck (they were inert `View`s); every collection scope resolves, including Unfiled, Systems and Research; every Collection deck row opens its own deck; both routes resolve their route parameter, and an unknown id gets a not-found state. Search, the Due-only filter and a four-key Sort (core's `sortDecks`, with the label always showing the active sort) all work, as do the deck's card search and its real status filter. | Values come from the demo `InMemoryRepository` through the shared hooks (§31); Collections are derived from canonical `Deck.parentId` through core's `collectionTree`. **New Deck, deck actions, card actions and Add Card are back as functional controls (§32):** New Deck on All Decks and inside a Collection, a deck actions sheet with working Edit and Delete behind core's shared deletion guard, a card-type chooser listing only Recall and Multiple Choice, and a per-row card actions sheet whose Edit appears only for a type that has an editor. Import, Collection settings and the Insights tab remain removed (§28). The deck's card list sits under a plain Cards heading; the deck's back control says "Back" and the collection name is a caption in the identity block. The decorative Filter dropdown and the deck favorite were removed earlier (D372, D373). Per-deck due counts follow real demo scheduling, because a reviewed card's due date moves (§25). Physical-device review is pending. |
| **Mobile Progress** (`/progress`, `apps/mobile/src/components/progress/`) | Native overview adapted from the owner concept at phone-readable density: exactly **Learned · Due · Reviews · Retention · Current streak**, plus a 30-day activity heat map, gap-aware retention trend, deck performance and recent milestones. **Each Deck performance row opens its deck**. The persistent tab shell stays visible with Progress selected. | Demo/local (§26): every value is computed from canonical Cards + ReviewLogs through shared core statistics. **The 30D/3M/1Y range group is removed (§28)** - the page reports one real window and its date pill names it; `demoProgressViewModel` keeps its `DateRangePreset` parameter, so a future range is a wiring change. Review activity, Undo and reset propagate immediately. No repository or persistence; physical-device review is pending. |
| **Mobile Notifications** (`/notifications`, `apps/mobile/src/components/notifications/`) | Mobile-only native inbox reached from the shared header bell: All/Unread filtering, grouped Today/Earlier updates, Mark all as read, an honest empty state, and a direct link to the existing Notifications settings placeholder. Read state lives in the demo workspace, so **the bell's dot reflects the real unread count** and **Mark all as read is reachable when only Earlier has unread items**. Every notification marks itself read and opens its explicit honest destination (§28), while its separate 44-point status action can mark it Read or Unread without opening it (§30). Read rows use a light neutral surface rather than a gray overlay. The settings shortcut is hidden in demo mode, where the Profile section it opened no longer renders. The nested route hides the persistent tab bar and supplies an explicit back affordance. | Values live in the demo workspace (§24), and read state resets on a full app restart by design. There is no push registration, scheduler, notification repository, persistence or fabricated production event stream. Physical-device review is pending. |
| **Mobile Review session** (`/review`, `/review/session`, `apps/mobile/src/components/review/`) | A real local demo study session (§25). One immersive shell (`ReviewSessionScreen.tsx`) owns the phase machine, the response, timing, the FSRS interval preview and the objective-result-to-suggested-rating mapping; the six native Views under `interactions/<type>/` render card content only, bound to the shared behaviors by one native registry. The queue is a per-mount snapshot of due demo cards; `reviewService.submit` computes the grade; the resulting `SchedulingState` and canonical `ReviewLog` are committed through the shared review hooks to the demo repository. Real next-due intervals on every rating button, a recommendation the learner may override, session progress, completion, one-level Undo, an honest caught-up state, and exit back to the origin. The tab bar hides for the session only. | Demo/local, in memory (§31): the session writes through the shared `usePersistReviewResult` / `useUndoGrade` hooks onto the demo `InMemoryRepository`, so a graded card and its ReviewLog commit as one operation, but nothing is persisted and the session resets on a full app restart, by decision. There is still no persist-failure state, because a demo write cannot fail - the awaited `onGraded` seam is where cloud adds one. Physical-device review is pending. |
| **Mobile Review entry** (`/review`, `ReviewStartScreen.tsx`) | The Review tab's landing surface: heading, due count, contributing deck names, one primary Start action, and an honest caught-up state. Its shared header and prominent 34px title now sit in the same padded scrolling frame as Progress, correcting the horizontal misalignment visible on device when the header was mounted outside that frame. Deliberately minimal - no charts, filters, streak tiles or session customisation - and built from Today's existing tokens, card surface and header. Keeps the persistent tab bar. | Reads the demo repository through the shared hooks (§31). Physical-device review is pending. |
| **Progress** (`/progress`, `/progress/history`) | Headline KPIs are exactly **Learned · Due · Reviews · Retention · Current streak**. Learned/Due/Streak are current-state values with no invented period delta; Reviews/Retention follow the selected period, with retention comparison in percentage points. The heat map, gap-aware deck-scopable retention chart, leaf-deck actionable performance table and milestones are all computed from real `ReviewLog`/`Card`/`Deck` data. **Review history** (`/progress/history`) is a real chronological per-review record, filterable by range/deck/rating. | 7 of 9 sidebar rows (Decks, Activity, Review lag, Milestones, Achievements, Stats, Reports) are `aria-disabled` "Soon" rows. Overview and Review history are live. |
| **Account settings** (`/settings`) | **Import / Export** (JSON backup) is fully functional. | Profile, Email & password, Appearance, Notifications, Privacy, Connected devices are inert greyed placeholders. Profile statistics render em dashes on purpose (D137). |
| **Login** (`/login`) | Page, session minting, redirect-back-to-requested-route, Supabase magic link. | In local mode the password is a dev/demo shell: never stored, sent, or verified. "Forgot password" is a deliberate `aria-disabled` placeholder — no reset backend. |
| **Roadmaps** (`/roadmaps`, `/roadmaps/:id`) | Create / rename / delete / canvas editing all work, now through `useDialogs()` rather than `window.prompt`, and the list page has a real `<h1>`. | Still **reskinned only** — pre-redesign layout and density, carrying Itera colors solely through `.itera-scope`'s token re-point. Deliberately out of primary nav (D11/D17), reachable by direct URL. |

---

## 4. AppShell / navigation state

- `apps/web/src/components/layout/AppShell.tsx` = `IteraSurface` (`.itera-scope` + `ForceLightTheme`) → `TopNav` → `<main class="mx-auto max-w-[1280px]">` → `<Outlet/>`.
- `TopNav` is presentational: logo, primary nav links, `rightSlot`. Its wordmark matches the finalized login branding in Inter Variable at weight 650. Primary destinations come from `primaryNavLinks.ts` and are exactly **Today (`/`) · Library (`/decks`) · Progress (`/progress`)**.
- Right side of the nav: `StreakBadge` + `AccountMenu`. Nothing else. `StreakBadge` reads the canonical `computeStreak` (`packages/core/src/domain/stats/streak.ts`) — the same calculation Today and Progress use — and the Today link's due badge (`useNavBadges`) has always been a real count.
- **There is no global Search and no global Create action** — removed as a product call (both are scoped concepts; search lives inside Library, create inside a deck). `CreateMenu.tsx` and `TopNav`'s search affordance were deleted, not hidden.
- No left sidebar, no bottom nav, no per-route topbar title slot. `Sidebar.tsx` / `BottomNav.tsx` / `navItems.ts` / `PageHeaderOverride.tsx` / `TodayShell.tsx` **were deleted**. A route that needs a heading renders it as ordinary page content.
- Local (page-level) sidebars do exist and are the convention for section navigation: `LibraryShell`/`CollectionNav`, `ProgressShell`/`ProgressNav`, `SettingsNav`.
- Roadmaps (`/roadmaps`) is deliberately absent from primary nav but still routed and functional.
- **The app is light-only, and now says so.** `.itera-scope` has no dark palette (spec §36 defers dark mode). `apps/web/index.html` declares `data-theme="light"` with no pre-paint restore script, and `getInitialTheme()` falls back to `'light'` — previously both said `dark`, which darkened the pre-router `AuthGate` screen because it renders outside `.itera-scope` and reads `--bg` from `:root`. `ThemeToggle.tsx`, the inert `dark` custom-variant and the unreachable `[data-theme='dark']` token block are **deleted**. `ThemeProvider`/`useTheme` are retained, and `Theme` keeps its `'dark'` member, because `CodeView`/`CodeEditor` select the `oneDark` syntax palette from it. Re-adding dark mode means re-authoring those 16 tokens.

## 5. Login / auth state

- `RequireAuth` (`apps/web/src/auth/RequireAuth.tsx`) is **one pathless layout route** wrapping the whole `AppShell` tree *and* `/review`. `/login` and `/design-preview/*` sit outside it.
- **The authentication policy lives in `@itera/core`; the browser supplies storage, the client and the routing.** `resolveAuthState()`, `createAuthEngine()`, `AuthProvider` and `useAuth` are all in `packages/core/src/auth/` and know nothing about `localStorage`, Vite or React Router; the web app injects an `AuthConfig` (mode + `LocalSessionStore` + a Supabase client getter) built in `apps/web/src/auth/webAuthConfig.ts` and passed as a provider prop from `apps/web/src/main.tsx`. `@/auth/AuthProvider` is a re-export shim.
- **Authentication mode follows repository mode.** `apps/web/src/main.tsx` reads `isSupabaseConfigured` **once** into `cloudEnabled` and uses it for both `configureRepository()` and `createWebAuthConfig()`, so exactly one auth model is ever active: with Supabase configured only a Supabase session is a session, and without it only a `LocalSession` is. A session belonging to the inactive backend is neither an identity nor an admission ticket, so `isAuthenticated`, `identity` and the repository can no longer disagree about which mode Itera is in (audit P1-3). The rule itself is the pure `resolveAuthState()`, tested once in core. `main.tsx` is the only production module that imports `isSupabaseConfigured`; `SignInPanel` and the settings Email & password section read `mode` from `useAuth()`. `session` still means the Supabase session specifically and is `null` in local mode.
- **A stale local session is cleared, not honoured, when Supabase mode boots.** The engine clears the injected session store once at start, and never reads a local record in that mode, so there is no window where the app renders authenticated before `getSession()` resolves. This is **session cleanup only** - the learner's IndexedDB workspace (decks, cards, review logs, drafts, roadmaps) is untouched, and is never silently uploaded or deleted. What happens to that local data when an origin moves to the cloud is a separate, still-unanswered product question ([`TODO.md`](TODO.md)). `signInLocal`/`signInDemo` are no-ops in Supabase mode; `SignInPanel` already never calls them there.
- **Local mode is gated.** A fresh browser lands on `/login` and must sign in or "Continue with demo workspace". No stored data was touched by this; only reachability changed.
- `apps/web/src/auth/localSession.ts` is the **single** storage seam for auth, and now implements core's `LocalSessionStore`: one key (`itera.session`, platform-owned - core never learns it), `localStorage` when Remember me is checked, `sessionStorage` otherwise, every access in `try/catch`, a corrupt value reads as signed out (`parseLocalSession` in core decides that). **Do not add a session/`localStorage` check anywhere else** - `apps/web/src/auth/storageIsolation.test.ts` now fails the build if you do.
- With Supabase configured the only real authentication is **magic-link OTP**. The password field, Remember me and the demo divider are hidden; the button sends a link. No password auth exists.
- `AuthGate` only blocks on the Supabase session bootstrap; it no longer decides what renders. It, `RequireAuth` and the Login screen are deliberately **not** shared: they encode React Router and web presentation, and web (magic link) and native (six-digit OTP) are expected to differ in sign-in interaction while sharing session semantics.
- The visual shell is a compact, chrome-free 1080px desktop surface. **Inter Variable is the finalized login family**, with the approved headings at weight 650 and body/UI copy in the 400–600 range; the temporary Manrope/Plus Jakarta Sans comparison and packages are gone. The three illustration cards are all 176px wide and retain the `login-v3.png` fan (`Dynamic Programming` −9°/left 52/top 50, `SQL Joins` +5°/left 226/top 40, `System Design` +9°/left 396/top 30), shifted left as a group with the front card lifted slightly. The bottom principles follow `login-icons.png`; illustration and principles still collapse at the established responsive breakpoints.

## 6. Account / avatar menu state

- `AccountMenu` + `AccountMenuContent` (`apps/web/src/components/layout/`). Built on the existing `FloatingPanel` — **no popover dependency was added.** 300px anchored, viewport-height-capped panel with `manageFocus` (focus enters the menu, arrows/Home/End walk it, Tab closes, Escape returns focus to the trigger). Below 480px (`useIsNarrowShell`) the identical content renders as a bottom sheet.
- Live rows: **Account settings**, **Import / Export**, and **Sign out** (enabled whenever the active mode has a session - a local/demo one in local mode, a Supabase one in Supabase mode).
- Placeholder rows: Preferences, Study settings, **Spaced repetition (FSRS)**, Keyboard shortcuts, Help & documentation, What's new, About Itera — focusable `aria-disabled` rows with a "Soon" pill (never `disabled`, never hidden). Spaced repetition joined that list on 2026-08-18: it used to link to `/settings/card-scheduling`, which is not a slug in `settingsSections.ts`, so `resolveSection` silently landed the user on Profile.
- The header block shows **real identity only**. There is no profile record and no display name in this product, so it renders the session's email (or "Demo workspace" for the demo identity, matching `AccountSettingsPage`'s subtitle) over a line saying where the data lives — "Stored in this browser" / "Synced with Supabase" / "Local data only". Since P1-3 that line cannot contradict the active backend: a `local`/`demo` identity only exists in local mode, so "Stored in this browser" can no longer be shown while the app is reading Supabase. The former hardcoded **"Your name"** line is gone; it read as fabricated account data.
- The grouped menu follows `profile-menu.png`: account/preferences; a divided study group; keyboard/help; What's new/About; Sign out. **It remains quick navigation only.** New settings still belong in `apps/web/src/features/settings/`; the menu links only the requested high-value shortcuts.

## 7. Today state

**Real, production.** `TodayPage.tsx` is still the same CSS Grid with named `grid-template-areas` (`"hero momentum" / "continue pace"`, one column below 980px via a `matchMedia` hook) driven by inline `style`, because Tailwind has no grid-area utility, and the page typography is unchanged. What changed is the data: `TodayPage` is now the route's only fetcher (`useSearchCards`, `useDueCards`, `useDecks`, `useReviewLogs`, `now` snapshotted once per mount so it agrees with `/review`), memoizes pure calls into `packages/core/src/domain/stats/`, and hands plain props to four presentational panels.

- **`SuggestedSessionHero.tsx`** — the bespoke, pixel-tuned 4-layer stacked card is untouched (**do not adjust its offsets/rotations/colors incidentally**; the settled transforms were re-measured against D170 after this milestone and match exactly). Its content is now the real due count, real contributing deck names in queue order (`A · B · C · +N more`), and a duration estimate from the median of the learner's own recent review durations, with a documented 20s-per-card fallback below 10 usable samples. When nothing is due the same box reads **All caught up / Nothing due** with the real next-due time, the primary action becomes Go to Library, and **Adjust session is not rendered** — no scope or size can create due work.
- **`MomentumPanel.tsx`** — four real rows in the same visual slots: **Current streak** (canonical `computeStreak`), **Retention** (the shared `computeRetention` over a trailing 30 days, eligible only when `stateBefore` is Review/Relearning; an em dash, never `0%`, when nothing is mature), **Due today** (the same count as the hero and `/review`), and **Next milestone** (a derived in-progress-deck continuation — "Finish X / n of m cards learned" — linking at a real session only when one exists). Weekly Goal was deleted; Retention took its slot, so the row rhythm and the single divider above Next milestone are unchanged.
- **`ContinueLearningList.tsx`** — real leaf decks with real due counts, real mastery percentages and the deck's own description when it has one, ordered due-first then most-recently-studied. A deck with due cards links to `/review?deck=<id>` ("Continue"); one without links to `/decks/<id>` ("Open"). The heading link is now **View all decks** — there is no topic concept in this product.
- **`PaceChart.tsx`** — the same hand-rolled SVG, now plotting **reviews completed per local calendar day** over seven buckets ending today, with a data-derived axis. Buckets are stepped as calendar days, so a review on a 23- or 25-hour DST day lands in that date's bucket. `You're on track` is gone: it claimed progress toward a target that does not exist.
- **`AdjustSessionDialog.tsx`** — new. Deck scope (all due / one deck, using `/review`'s own `subtreeIds` semantics and listing every deck by full path) plus session size (all / 10 / 20 / 30 / custom), starting `/review?deck=&limit=`. Centered modal on desktop, bottom sheet below 480px. **Nothing is persisted.**
- **Page states** — a `Loading…` line until the four queries resolve (an empty due result is otherwise indistinguishable from "not fetched", and the grid would flash "All caught up"); one intentional empty state when there are no decks and no cards; otherwise the grid.

## 8. Library state

All three views render inside `LibraryShell` + `CollectionNav`: a centered, bordered white two-pane surface whose local sidebar drills all the way to individual decks. The sidebar uses restrained line icons, visible branch connectors, an enlarged add control, card-count rollups, and a footer Settings link; it collapses to `CollectionNavDrawer` below the wide-Library breakpoint.

- **Default Library / All Decks (`/decks`)** — `LibraryBrowserPage`. The All Decks scope follows the locked `all-decks.png` composition: identity title/description and divider, an orange New Deck action plus an Import Deck shortcut to the real JSON Import & Export settings section, 44px search/filter/sort controls, descriptive deck rows with bold metric values, and always-on ten-deck pagination whose count reports the visible range. These proportions are deliberately scoped to **All Decks only**; Unfiled and Collection identity views retain their own compositions. Real `useDecks` + `useSearchCards` + `useDueCards` data drives per-deck cards, due, mastery and last-studied metrics from `deckMetrics.ts`; create / rename / delete remain live.
- **Parent / container ("Collection") view** — `LibraryCollectionView`, rendered by `LibraryBrowserPage` when the selection is a Collection. Identity header, rolled-up stats (`aggregateMetrics`), its child decks, and any cards filed directly on it. A direct `/decks/:id` navigation whose id resolves to a deck-with-children **redirects here** instead of rendering an incorrectly empty leaf page.
- **Focused leaf-Deck view (`/decks/:id`)** — `LibraryDeckPage`. Cards / Insights tab split inside the locked-reference composition: bold final breadcrumb, enlarged aligned metrics, wider 44px toolbar controls, reference-like non-card icons and white surfaces. The Cards tab's search / type / status / sort toolbar and **always-on seven-row pagination** operate over a `RowMeta` projection of the one card list; multi-page footers report the visible card range. Manual drag ordering applies to every card within the visible page; the grip floats in the row inset so card-type tiles stay close to the list border. Clicking a row **opens the card in study preview** (`/cards/:id/study`); Edit/Duplicate/Move/Suspend/Delete live in the row kebab menu. There is no separate read-only card detail screen, by decision. Deck settings opens with a 24px separation from the identity/action area and closes on a successful save, Cancel, or a second click of its toggle. The identity header and metrics stack at phone widths; the table keeps its deliberate horizontal scroll.

**"Collection" is UI-only.** It is derived structurally from the existing `Deck.parentId` tree in `packages/core/src/library/collectionTree.ts` (any deck with children is a Collection node; childless decks are the browsable Library decks). The derivation is **core-owned** so a future native Library cannot build a second tree from the same data; the web file at `apps/web/src/features/library/collectionTree.ts` re-exports it and adds only the two `URLSearchParams` helpers that encode a selection into a query string. **There is no `Collection` type, no table, and no migration** — see §13.

## 9. Progress state

Real, mockup-driven, production. `ProgressShell` + `ProgressNav` + `components/*`. The five headline tiles are exactly **Learned · Due · Reviews · Retention · Current streak**. Streak copy is singular at one day (`Best: 1 day`), through the shared `formatDayCount` in `packages/core/src/domain/stats/streak.ts` that Today's Momentum panel uses too. Learned is unique current non-suspended cards with at least one log; Due reuses `useDueCards`; Reviews is the number of logs in the selected period; Retention is successful mature attempts (`stateBefore` Review/Relearning and rating Hard or better) divided by all mature attempts; Current streak reuses `computeStreak`. Only Reviews and Retention receive period comparisons, and Retention renders that change in percentage points (`pp`). The page retains the activity heat map, deck-scopable retention chart and derived recent milestones. Missing retention buckets break the SVG into separate path segments instead of implying observations across gaps, and an observed bucket with no observed neighbour is drawn as a point rather than dropped — `retentionChartPath.ts` owns the projection and returns both, so lines and markers cannot disagree. Every chart is hand-rolled SVG/CSS; **no charting library is a dependency and none should be added.** Every local-day calculation on this page — streak, heat-map cells, milestone runs and dates, selected/previous period boundaries, and the Today/Yesterday labels — uses the calendar arithmetic in `packages/core/src/domain/stats/calendarDay.ts` and is DST-safe.

Deck Performance contains **Deck · Learned · Due · Retention** and no misleading Trend. It intentionally lists **leaf/actionable decks only**, so every column in a row has one direct-card scope and parent/child work is not double-counted. A deck with active cards remains visible even with zero reviews in the selected period. Ordering is: has due work, larger due count, weaker valid retention, most recently studied, then name. Rows with work due open `/review?deck=<id>`; the others open the deck. The accepted leaf rule means cards filed directly on a deck-with-children do not get their own row, matching Continue Learning's existing tradeoff; they still contribute to global KPIs and the parent-scoped Review route.

**Review history** (`/progress/history`, `ReviewHistoryPage.tsx`) is the second live Progress destination: one row per `ReviewLog`, newest first, with card, deck, rating, resulting interval and timestamp, filterable by range (30D/3M/1Y/**All**, its own local presets — *not* the shared `DATE_RANGE_PRESETS`, whose bounded windows exist for Overview's period-over-period deltas), by deck (including the deck's subtree) and by rating. Reviews whose card was since deleted are kept, shown as `(deleted card)`; rows logged before `ReviewLog.dueAfter` existed render an em dash for interval rather than a fabricated number. Rating pills are deliberately neutral rather than a danger/warning/success/accent set, with the palest accent tint on Again only (see the decisions log). The "Activity" sidebar row stays a "Soon" placeholder on purpose — it reads as a broader feed (cards created, decks edited, imports) and the name is left free for it.

Retention chart and Review-history attribution go through `packages/core/src/domain/stats/cardDeckIndex.ts`'s `buildCardDeckMap(cards)`, built once per render and passed down. Deck Performance receives current cards directly because it needs active-card, Learned and Due membership as well as historical attribution. In both cases a moved card follows its current deck and a deleted card's old log is not attributed to a current deck.

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

Registry: `apps/web/src/features/reviewV2/interactions/registry.ts` (deliberately `Partial<Record<…>>` so a future 7th type fails loudly). Authoring shells live in `apps/web/src/features/cards/` with per-type pure form/save modules in `packages/core/src/domain/cards/`.

**Behavior and View are now separate owners.** Each type's `interactive` flag, `isResponseReady`, `autoGrade` and semantic `widthFor` live in `packages/core/src/interactions/<type>.ts` as an `InteractionBehavior`; the six Views stay web-specific and each `interactions/<type>/index.ts` is `{ ...<type>Behavior, View }`. Nothing in `apps/web/src/` reimplements any of those four, and a test asserts the binding holds by reference. `widthFor` returns `'default' | 'wide'` — the intent — and only `ReviewSessionScreen` turns that into `max-w-2xl`/`max-w-4xl`.

**New-card composition:** `/decks/:deckId/cards/new` now follows the locked `add-new-card.png` reference as one continuous 880px surface, expanding to 1120px only while the desktop preview drawer is open. The page header is **Cancel | New card**; Recall is selected by default; the existing six interaction icons are unchanged; numbered Choose interaction / Card content / Organize sections use inset hairlines; Deck and Tags keep their existing values, gain identifying icons and share one explicit control height; Save and bordered Cancel live in the footer. Narrow screens retain Editor/Preview tabs. No character limits or counters were added.

**There is one card model, one rendering path and one authoring path.** `apps/web/src/features/cards/` holds the six editor shells; `apps/web/src/features/reviewV2/interactions/` holds the six views.

`/cards/:id/edit` is one switch on `interaction.type` picking the matching editor shell; saving reuses the card's id/createdAt/scheduling/suspended so `ReviewLog` history survives. Its fallthrough is a **"Card not found"** state, reachable only for an id that resolves to no card.

## 11. Review integration state

- `/review` is a **top-level, chrome-free route** (no `AppShell` ancestor), inside `RequireAuth`. It renders `ReviewSessionV2` → `ReviewSessionScreen`, the exact same shell `/design-preview/review/*` uses. One shell, not two. The shared width-safe Review strip follows `recall-card.png`: a literal **< Exit session** control left, bold position centered, and a bordered keyboard key plus action hint right. Exit and the right-side status/action use the same UI typography; Exit has the expected pointing-hand cursor. The strip's white background and border are full-bleed, while its controls share `TopNav`'s centered 1280px frame so the left/right controls align with the logo/profile edges. Session-backed surfaces also reserve 56px beneath their final content, matching the strip-to-card gap above.
- **The session queue is a snapshot.** `/review` accepts `?deck=<id>` (that deck plus its subtree) and `?limit=<n>` (the first n cards, ignored unless it is a positive integer); `apps/web/src/features/review/useSessionQueue.ts` freezes the resolved queue when the session starts, and `ReviewSessionV2` is keyed on that snapshot's id. It used to be keyed on `cards.length` over the live due query, so every grade remounted the session — the counter shrank (`1 of 5` → `2 of 5` → `2 of 4`), the undo stack was lost, and the last card landed on the pre-session "Nothing due" state instead of "All done". A snapshot lives for one mount, so leaving `/review` ends the session and a later visit at the identical URL resolves a fresh queue. Neither parameter is persisted; there is still no `StudySession` entity.
- Flow is strictly two-phase: Question → reveal → Answer → one FSRS grade. Objective types compute an `ObjectiveResult` from `packages/core/src/domain/grading/*`, show a pass/fail banner, and pre-select a rating the user can override.
- `buildReviewLog` records both required `stateBefore` (the scheduling state immediately before the grade) and `state` (the resulting post-grade state). Mature retention consults only `stateBefore`; there is no post-state fallback for prototype rows.
- **A review result is computed once, and persisted as one storage operation.** `reviewService.submit` returns `{after, log}` and writes nothing; `usePersistReviewResult` hands that exact pair to `repo.commitReview`, which commits the graded card and its ReviewLog together or commits neither. Undo is the same shape in reverse (`repo.revertReview`). Nothing below `reviewService` recomputes FSRS or mints an id.
- **A failed write does not look like a graded card.** The phase machine has an explicit `persistFailed` state (`apps/web/src/features/reviewV2/reviewPhase.ts`), reached only from `rating`, and `GRADED` is dispatched only once the write committed. On failure the session does not advance, the ratings stay disabled, and an inline alert explains what happened with a focused **Try again**. Retry re-sends the identical `SubmitReviewResult` — same log id, same scheduling, no second FSRS computation — so a card can never be graded twice by retrying. Copy comes from `packages/core/src/domain/review/reviewPersistFailure.ts` and states only what the live backend's `reviewGuarantee` actually promises; raw IndexedDB or PostgREST text is never rendered.
- The shared rating controls follow the locked `answer-icons.png` reference: Again uses refresh, Hard ascending bars, Good a circled check, and Easy double chevrons. Each card shows its numeric shortcut plus the real FSRS next interval; the suggested/selected grade receives the single orange outline/icon signal. They render four-across from `sm` upward and 2×2 on phones.
- `/preview` renders the **real card** through `ReviewSessionScreen` with `hideRating`. It uses the shared Review strip instead of its former tag/jump-input header; `AppShell` gives preview routes a full-width, zero-top-padding main surface so the strip sits flush beneath and spans the same page width as the navbar. In deck flip-through, bordered Prev/Next controls sit immediately around the centered `X of Y`; Left/Right arrows perform the same navigation unless focus is inside an interactive card control or editor. At phone widths the redundant shortcut hint yields its space to this centered navigation group. `/cards/:id/study` uses the same strip treatment without deck navigation. After reveal, preview-only cards say **Answer revealed**; surfaces with rating controls say **Rate your answer** instead of the old `1–4 to rate` hint.
- Every interaction front uses the shared `CardPrompt`: 24px normally, 20px only beyond 280 normalized characters or six non-empty lines. All six v2 editors warn authors when that fallback activates and recommend shortening or splitting the card.

---

## 12. Persistence / auth / repository architecture that must not be broken

- **One seam: `Repository` (`packages/core/src/data/repository.ts`), and one registry (`packages/core/src/data/registry.ts`).** `configureRepository(factory)` is called once per platform entry point; `getRepository()` builds lazily, caches, and **throws if never configured** - core has no default. The web app's only composition point is `apps/web/src/main.tsx`, which registers `DexieRepository` by default or `SupabaseRepository` (`packages/core/src/data/supabase/SupabaseRepository.ts`) when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set - the same `cloudEnabled` value the shared auth layer is configured from in the same file, so backend mode and auth mode cannot disagree - `main.tsx` is the only production module that reads `isSupabaseConfigured` at all. The web test suite configures Dexie explicitly in `apps/web/src/test/setup.ts`. **Reading that configuration and building the browser Supabase client is the web app's job** (`apps/web/src/data/supabase/client.ts`): the shared backend takes a ready client and never looks at the environment, which is what lets a future Expo app configure the same class from `EXPO_PUBLIC_*`. **No component, hook, or page may import a backend directly.**
- **One auth policy: `packages/core/src/auth/`.** `resolveAuthState()` is the P1-3 mode rule, `createAuthEngine()` is the lifecycle (bootstrap, subscription, teardown, sign-in, sign-out), and `AuthProvider`/`useAuth` are the React binding over it. Core reads no storage, no environment and no route: the platform hands it an `AuthConfig`. The web app's adapters are `apps/web/src/auth/localSession.ts` (the `LocalSessionStore` over browser storage, and the **only** web module that may touch auth storage) and `apps/web/src/auth/webAuthConfig.ts`. Router guards and the Login screen stay web-specific by design. **Do not add a second implementation of the auth mode decision, on either platform** - that is exactly what audit P1-3 was.
- Members: `cards`, `decks`, `drafts`, `reviews`, `roadmaps`, plus three whole-operation members that exist because only a backend knows whether several stores can be written as one unit: `replaceAll`/`mergeAll` with `importGuarantee`, and `commitReview`/`revertReview` with `reviewGuarantee`.
- **Every entity is stored as one opaque JSON blob** keyed by an inline `id` (`data jsonb` in Postgres, a plain object in Dexie). Supabase adds a few generated columns (`due`, `suspended`, `deck_id`) purely for indexing; **all text/tag/type filtering happens in memory identically in both backends** so results match. Adding a field to a type therefore needs no migration.
- **All data access goes through TanStack Query hooks in `apps/web/src/hooks/`** (`useCards`, `useDecks`, `useDrafts`, `useReview`, `useRoadmaps`, `useBackup` — there is one card hook family, not two). Query keys are centralized in `apps/web/src/hooks/queryKeys.ts`.
- **`Card.scheduling` is the sole source of truth for scheduling**, embedded on the card itself. The half-built `CardState` extraction (a write-only store nothing read) was removed with the card-model convergence; separating content from scheduling again is a deliberate schema change with its own migration, not a refactor.
- **Dexie schema changes require a `version()` bump** in `apps/web/src/data/dexie/db.ts` (declare only new/changed stores). Version 2 is a deliberate data-only upgrade: it clears `reviewLogs` and nothing else so an old row without required `stateBefore` can never enter current analytics.
- **Supabase tables need GRANTs, not just RLS.** Postgres denies before RLS runs: RLS-without-grant = **403 on every request**; RLS-without-policy = empty 200. Every table in `supabase/schema.sql` needs table + `enable row level security` + an `own rows` policy + `grant select, insert, update, delete … to authenticated`. `schema.sql` is **not** auto-applied — a human runs it in the SQL editor.
- **Supabase collection reads paginate to completion.** A repository method whose contract is "return all matching entities" does **not** inherit PostgREST's per-request row cap: `selectAll` in `packages/core/src/data/supabase/SupabaseRepository.ts` loops `.range(offset, offset + pageSize - 1)`, advancing by the rows actually returned and stopping on an empty page or on the exact count, so it stays correct even when the project's **Max rows** is *below* the requested page size. Never infer "last page" from "page shorter than requested", and never put an offset or cursor on the `Repository` interface — paging is one backend's implementation detail. Every paginated query carries a deterministic order with a unique tie-breaker (`id`) before `.range(...)`, or offset paging may duplicate or skip rows. `cards.getDue`'s `limit` stays in memory for the same reason its deck/tag filters do (audit P1-4).
- The Supabase **publishable** key (`sb_publishable_…`) is `VITE_SUPABASE_ANON_KEY`. The secret key must never reach the frontend.
- Backup files (envelope in `packages/core/src/domain/io/backup.ts`, persistence orchestration in `packages/core/src/data/backup.ts`, with the configured-repository tier in `packages/core/src/hooks/useBackup.ts`) remain at version 2; no envelope bump was needed because the format already includes `reviewLogs`, AI-generated imports intentionally carry an empty array, and stricter validation of an already-required shape is not a format change. **Imports are validated before any write**: `parseBackup` validates every entity in every array it will write — cards, decks, ReviewLogs (including required `stateBefore`, numeric rating/timestamps and both scheduling states), **drafts and roadmaps** — so an incompatible nonempty prototype-history backup, or an entity IndexedDB cannot key, is rejected rather than imported. `importBackup` then applies the repository-aware `card.deckId` rule before any write, against the `Repository` it was handed rather than an ambient one. **Replace is all-or-nothing on the local backend**: `repo.replaceAll()` runs the clear and the write inside one Dexie `rw` transaction, so a failed replace-import leaves the previous workspace exactly as it was; on Supabase there is no cross-request transaction, so Replace is refused rather than emulated (see §15 and the 2026-08-22 decision entry). **Review persistence is transactional on both backends**: Dexie runs the graded card and its ReviewLog inside one `rw` transaction over `cards` + `reviewLogs`; Supabase calls the `commit_review` database function (`supabase/migrations/0004_review_commit_rpc.sql`), which does both statements inside PostgREST's per-request transaction. That function is `security invoker`, so the existing `own rows` policies remain the ownership check, and its log insert is `on conflict (id) do nothing` so a retried commit cannot become a second review. It has **not** been verified against a live database (§15, `TODO.md`). The `app: 'code-srs'` marker remains a legacy format identifier, not the product name.

## 13. Migrations that have NOT happened

| Migration | Status |
|---|---|
| **Phase G — Collection/Deck split** | **Not started. Even the read-only preflight report has never been run.** There is no `Collection` type, no `collections` table, no `packages/core/src/domain/collections/tree.ts`. The Library ships against the UI-only `parentId` derivation instead. |

`packages/core/src/domain/migration/runner.ts` (`MigrationRunner`) is the contract every explicit migration must satisfy: dry-run-able, reportable, reversible. See [`itera-migration-plan.md`](itera-migration-plan.md) §0 for why lazy migration was rejected for these.

## 14. Known problems — visual debt

- **`InteractionLabel` is a grey pill; the locked mockups draw it orange** (a soft-orange pill in `matching-card.png`, plain orange text in `ordering-card.png`). Left alone deliberately — the label is shared by all six interaction types, so changing it is a six-card decision, not a per-card one. **Open.**
- **Matching on narrow viewports:** a two-column card now lays out side by side at 390px (verified live). Cards with 3+ columns fall back to the stacked flow. The spec's "stepwise pairing flow on mobile" is only partly satisfied.
- **Roadmaps is the last reskinned-only surface** — it carries Itera colors but pre-redesign layout/density. It is the only one left; Browse, Drafts, Stats and the v1 card editor were deleted rather than redesigned.

## 15. Known problems — technical, compatibility and data-risk debt

**Compatibility debt** (what remains after the v1 surface was deleted):

- **`/roadmaps*` is routed and working but out of primary nav** (D11/D17), so it is direct-URL only, and it is still visually pre-redesign (§14). **Do not delete it** — the data, repository member and Supabase table are untouched.
- **`apps/web/src/hooks/useDrafts.ts` is a deliberately retained orphan.** The drafts UI was deleted, but the entity survives end to end: `repo.drafts`, the Dexie store, and the `drafts` array in backup import/export. The hook has no caller. **Do not "clean it up"** — deleting it would be the first step toward dropping user data that a backup file still round-trips.

**Data / migration risk:**

- **Replace-import is unavailable on the Supabase backend.** PostgREST has no transaction spanning requests, so a five-table clear followed by five uploads can stop halfway and cannot be rolled back. `SupabaseRepository.replaceAll` therefore throws before issuing any request, `canReplaceImport()` returns false, and the Import / Export section renders Replace as an `aria-disabled` option with the reason. Merge is unaffected. Closing this needs a database-side function doing the delete + insert for all five tables in one transaction; it is recorded in [`TODO.md`](TODO.md) and deliberately not written blind against a project that cannot be tested.
- **The Supabase schema and `0003_review_log_state_before.sql` are unverified against a live database** (the project owner's Supabase project was deleted mid-development). Migration 0003 deliberately deletes prototype `review_logs`, adds the required-`stateBefore` JSON check, and re-grants authenticated CRUD. Written to the same standard as the rest of the schema; flagged rather than assumed correct.
- **`0004_review_commit_rpc.sql` is unverified against a live database, for the same reason.** It adds the `commit_review` and `revert_review` functions that make cloud review persistence transactional, both `security invoker` with a pinned `search_path` and `execute` granted only to `authenticated`. It is non-destructive — it creates no table, drops nothing, and its rollback is two `drop function` statements — which is why it was written now while the destructive `replace_workspace` function of D242 still was not. What only a live Postgres can settle is recorded in [`TODO.md`](TODO.md); the client contract is covered by tests against the fake client, but that fake is a model of the function, not the function.

**Technical debt:**

- **Component tests cannot catch focus/visibility bugs.** `happy-dom` has no visibility semantics, so `HTMLElement.focus()` on a `visibility: hidden` element silently no-ops there but fails in Chromium. Anything focus- or layout-dependent needs a real browser pass.
- **Transitioning a Tailwind-composed `transform` does not animate reliably.** `scale-*`/`rotate-*`/`translate-*` (including `group-hover:` variants) each write a separate custom property; transitioning the composed value snaps instantly in Chromium. Compute such transforms as one literal `style.transform` string in JS.
- **`npx tsc --noEmit` is a no-op in this repo and must not be used as the typecheck gate.** `tsconfig.json` is solution-style (`"files": []` plus `references`), so that command checks zero files and is trivially "clean" — every doc and decision entry that cites it as evidence is citing nothing. The real gate is **`npx tsc -b --force`** (what `npm run build` runs). Related: `apps/web/tsconfig.app.json` excludes `*.test.ts(x)`, so **the web app's test files are never typechecked** — a dangling import inside a test surfaces only as a Vitest resolve error at run time, never as a type error, and an inline fixture can silently rot into a shape that no longer exists (`apps/web/src/data/backup.test.ts` carried a deleted v1 card until 2026-08-18). Delete test files *before* the modules they cover, and for entity fixtures that must stay true to a type, put them in a non-test module — `packages/core/src/domain/io/backupFixtures.ts` is the pattern. **`packages/core`'s tests are the exception since the domain extraction**: `tsconfig.core.test.json` is a second project over the same directory with `types: ["node"]` and still no DOM, so core tests are in the build. It found the hazard immediately - four `domain/cards` tests called `legacy*CardToForm` functions deleted with the v1 card model and passed anyway, because `.toThrow()` is satisfied by the resulting `ReferenceError`. The same hazard remains open for every web test.

## 16. Tests / build status

Measured 2026-08-25 after M-DEMO-4 (§27). The established web/core counts remain unchanged; only the mobile suite grew.

```
npx vitest run       → 111 test files, 1064 tests, all passing (75.94s)
                       two projects: core 48 files / 614 tests, web 63 / 450
                       (identical to the pre-move baseline; no test moved package)
npx tsc -b --force   → clean, no errors (four projects: core, core tests, app, node)
npm run lint         → clean, zero warnings (whole repository, including apps/mobile)
npm run build        → successful (existing chunk-size advisory only) -> apps/web/dist/
npm ls react         → one deduped React 19.1.0; one @tanstack/react-query 5.101.1
```

Mobile is intentionally checked outside the root TypeScript solution: Expo's generated config is not converted into a composite project. `expo-doctor` passes 18/18 checks, Expo's TypeScript 5.9.3 check and `expo lint` are clean. **`npx jest` in `apps/mobile` is 30 suites / 417 tests**: M-DEMO-3 added seed-history integrity, shared-statistics wiring, range/heat-map/chart/deck/milestone assertions and cross-surface grade/Undo/reset propagation, and its corrections added the card-vs-history fixture invariant and the 30-day Today-retention regression; M-DEMO-4 added card resolution, card-row navigation, deck-scope resolution, the six-type card-study suite with its non-persistence assertions, and scoped deck metrics with Undo (§27). Those assertions cover **mobile wiring only** — core's algorithms are proven once under Vitest and are never re-asserted there (master plan D10). The iOS export bundles successfully at 4.2 MB hbc. Physical-device visual and interaction acceptance of M-DEMO-3 and M-DEMO-4 remains pending owner review.

**Bundle after the relocation.** JS is byte-for-byte the same size — main chunk `1,074.44 kB` / `305.94 kB` gzip, the three lazy chunks unchanged. Content hashes moved because module ids are path-derived. **CSS shrank `68.43 kB` → `66.79 kB`** (gzip `15.19` → `14.89`): Tailwind v4 auto-detects sources from the Vite root, which is now `apps/web` rather than the whole repository, so 20 bare utilities that existed only because Tailwind was reading class names out of `docs/*.md` and the agent instruction files are no longer emitted. Each was verified unused by the app, and every variant form the app does render was verified still present. PWA precache is unchanged at **24 entries** (2409.23 KiB vs 2410.83 KiB, the same 1.6 KiB of CSS).

**This is a fully clean baseline.** Treat any new warning as a regression introduced by the change that caused it.

**1064 across 111 files is the current correct count**, up from 1031/109 (the interaction-behavior split added `packages/core/src/interactions/behaviors.test.ts`, 24, and `apps/web/src/features/reviewV2/interactions/registry.test.ts`, 9; the split itself moved no test and the main chunk moved 1,074.39 kB → 1,074.44 kB, gzip 305.87 → 305.95). Before that it was **1031 across 109 files**, up from 914/101. The **+8 files and +117 tests** are all new coverage; the parser extraction itself moved no test, because the parser had none. No dependency was added and the main bundle chunk moved 1,073.22 kB → 1,074.39 kB (gzip 305.32 → 305.87); the design tokens are tree-shaken out of production entirely, since only a test consumes them.

| file | tests | what it protects |
|---|---|---|
| `packages/core/src/content/parseRichText.test.ts` | 28 | the Itera text syntax's **first tests ever**: prose, empty/whitespace, inline code, fenced with and without a language, an info string after the language, an unterminated fence, two fences in a row, `**` beating `*`, inline code beating emphasis, **underscores never being emphasis markers**, unmatched/malformed markers staying literal, no match across a newline, the blank-lines-dropped/spaces-kept rule, determinism across repeated and interleaved calls (which locks the module-scoped `FENCE` regex's `lastIndex` reset), and the structural safety properties: every payload comes back as an inert node, the node-kind union stays closed, and no node carries anything but plain strings |
| `packages/core/src/content/imageSource.test.ts` | 13 | the card-image URL policy: an accepted Itera-generated data URL and all five allowed media types; rejected `https:`, `http:`, protocol-relative `//host`, `blob:`, `file:`, `javascript:`/`vbscript:` in any casing or with leading whitespace, `data:text/html`, `data:image/svg+xml`, non-base64 and empty payloads; every whitespace-carrying value refused so a browser's URL-attribute whitespace stripping cannot turn one media type into another; totality over non-strings; and that authoring's filter and the `accept` attribute derive from the same list |
| `packages/core/src/content/plainText.test.ts` | 6 | `stripInlineMarkers` parity with the `plainLabel` it replaced, including its deliberate marker-blindness |
| `apps/web/src/components/text/RichText.test.tsx` | 18 | the web renderer: DOM equivalence per syntax (element choice, the inline-code pill's exact classes, the `whitespace-pre-wrap` paragraph, `LazyCodeView` and its language, authored order, the caller `className`), then the security matrix through both `RichText` and `InlineText` — no script/frame/handler/URL from any payload, angle brackets counted so none was consumed into markup, code blocks literal, educational content byte-identical, and a sentinel that is never set |
| `apps/web/src/features/reviewV2/contentSecurity.test.tsx` | 31 | **all six interactions** in both phases with every author-controlled string poisoned, driven through the production `definition.View` — the same components Review, `/preview`, `/cards/:id/study` and all six authoring live previews mount — plus `CardPrompt`, `TipPanel` and `ExplanationPanel`, and the walkthrough image's renderer half |
| `apps/web/src/data/importedContentSecurity.test.ts` | 8 | the stored-XSS sequence end to end: a structurally valid backup carrying payloads in every field of all six interaction types imports through the real path into the real Dexie backend, persists **byte for byte**, and parses back into inert nodes; generics/templates/HTML examples round-trip unmutated; every rejected image scheme is refused with nothing written; a legitimate embedded image keeps its base64 unchanged |
| `apps/web/src/components/text/renderingSinks.test.ts` | 4 | the durable half of the audit: no production module in `apps/web/src/` names `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `eval(` or `new Function(`, with non-vacuity and comment-tolerance both asserted |
| `apps/web/src/design/tokenDrift.test.ts` | 7 | the CSS↔TS token seam, in **both** directions, plus a parse-sanity floor, the exact two-value shadow exemption, and an assertion that no token key names a layout mechanic |
| `packages/core/src/interactions/behaviors.test.ts` | 24 | the six shared interaction behaviors, as **wiring** rather than re-tested grading: the set covers the six types once each, only Recall is self-graded and only Matching states a width intent; each readiness rule at its real boundary (empty/partial/duplicate/complete); each grader hookup including partial credit surviving as a fraction for Ordering, Matching and Walkthrough; Recall carrying **no** grader at all; and an all-recall Walkthrough returning `null` rather than `{correct:false}` |
| `apps/web/src/features/reviewV2/interactions/registry.test.ts` | 9 | the web registry: all six types resolve, each definition's `type` matches its key, each carries the expected View, and — the point of the split — each definition's `interactive`/`isResponseReady`/`autoGrade`/`widthFor` is the **same reference** as core's behavior object, so a web reimplementation fails here. Plus the deliberate runtime throw for an unregistered type, with no silent fallback, and an anti-vacuity case proving a registered type still resolves |

**Anti-vacuity was checked for every fix.** A single `dangerouslySetInnerHTML` in the text renderer fails **25 of 53** cases across the three renderer suites and the sink scan. Removing the image guard from the renderer and the validator fails 3. Perturbing one token value, and deleting one token, each fail the drift test in the direction they should. Deleting the registry's `if (!def) throw` was run as a mutation and fails the registry suite's throw case while leaving the other eight green, which is exactly the discrimination that test claims.

**914 across 101 files was the count before it**, up from 859/97. The **+4 files and +55 tests** of the auth extraction are all new coverage, and none of the existing auth assertions changed:

| file | tests | what it protects |
|---|---|---|
| `packages/core/src/auth/resolveAuthState.test.ts` | 10 | the P1-3 mode rule in isolation: a stale local record never authenticates in Supabase mode and is not an identity, a Supabase session never substitutes for a local one, a real session outranks a stale record, and a session with no email is authenticated but identity-less |
| `packages/core/src/auth/authEngine.test.ts` | 25 | the lifecycle, with no DOM and no renderer: loading before the bootstrap, all four bootstrap outcomes (session / none / resolved error / rejection), the stale record cleared at start, sign-in writing through the injected store with the right `remember`, demo unremembered, sign-out, the auth-state channel clearing `sessionError`, a snapshot stable under `Object.is`, and teardown - late resolve, late reject, unsubscribe, and start→teardown→start |
| `packages/core/src/auth/localSession.test.ts` | 12 | the session model: `createLocalSession` shape and distinct ids, and eight corrupt/absent inputs that must all read as signed out |
| `apps/web/src/auth/storageIsolation.test.ts` | 4 | exactly four web modules may name `localStorage`/`sessionStorage`, nothing under `apps/web/src/auth/` but `localSession.ts`, and none of the login/settings/layout surfaces |

Plus 4 `browserSessionStore` cases added to `apps/web/src/auth/localSession.test.ts` (7 -> 11). The previous baseline, for reference, was **859 across 97 files**, up from 835/93. The suite is now **two Vitest projects** (`vitest.config.ts`): the web one keeps `apps/web/src/test/setup.ts`, the core one runs with **no setup file**, and the top-level command runs both. Nothing was lost to the glob change — the split is 41 core + 56 web against the previous 38 + 55.

The **+4 files and +24 tests** are all new and all about the extraction:

| file | tests | what it protects |
|---|---|---|
| `packages/core/src/data/registry.test.ts` | 9 | the registry contract: unconfigured throws, the factory is lazy, the instance is cached and built once, reconfiguration drops the cached instance and does not re-run the old factory, and the module names no backend |
| `packages/core/src/hooks/moduleScope.test.ts` | 5 | importing every hook module — and the whole barrel — against an **unconfigured** registry does not throw, plus a source scan proving no `const repo = getRepository()` at module scope remains |
| `packages/core/src/hooks/useBackup.test.ts` | 3 | the configured-repository helpers delegate to the primitive, and follow a reconfiguration |
| `apps/web/src/hooks/repositoryResolution.test.tsx` | 4 | a query hook and a mutation hook read/write the **configured** repository, and follow a reconfiguration between renders rather than a captured instance |

Plus 3 assertions added to existing files: `qk` and `getRepository` reference-identity in `apps/web/src/types/coreSurface.test.ts`, and the peer-vs-dependency check in `packages/core/src/platformNeutrality.test.ts`.

`apps/web/src/hooks/repositoryResolution.test.tsx` is in the **web** project deliberately: a hook needs a React renderer and core has no DOM, so core covers the import-time half and the web covers the render-time half.

**835 across 93 files was the count before this step.** The arithmetic from 831/93 is short because Step 1.3 was a relocation: four files left `apps/web/src/data/supabase/` for `packages/core/src/data/` and four arrived, so the file count did not move, and the split became **38 core + 55 web**. The **+4 tests** are all new orchestration coverage in `packages/core/src/data/backup.test.ts` — that the explicitly passed `Repository` is the one actually read (two backends, two different files), that `canReplaceImport` still reports `false` for the cloud backend, and that both a refused Replace and an unresolved deck reference reject with **no table write issued at all**. The old `backupCompleteness.test.ts` became that file and *lost* machinery rather than gaining it: passing the repository in removed the `vi.mock` of the client module, the `vi.hoisted` client holder, `vi.resetModules()` and the dynamic import it previously needed. `backendParity.test.ts` stayed in the web app because it is the one test that needs `DexieRepository` and `SupabaseRepository` at once, and Dexie does not belong in core.

Typechecking core's tests earned its keep a second time: `SupabaseRepository.test.ts` had been invisible to `tsc` as a web test and failed immediately on arrival, because `promise.catch((e) => e as ImportFailure)` is typed `void | ImportFailure`. `packages/core/src/test/rejection.ts` replaces that pattern and additionally fails loudly if a promise expected to reject resolves.

**The 831/93 arithmetic from 828/91 is preserved below**, because a relocation should not move a test count at all:

- **+2 files, +7 tests** — one new `packages/core/src/platformNeutrality.test.ts` (4 structural cases), one new `apps/web/src/features/library/collectionTree.test.ts` (1 case, the URL round-trip block split out of the file that moved to core), and 2 cases added to the existing `apps/web/src/types/coreSurface.test.ts`. Net files: 91 + 2 new = 93; the other 33 core files are **moved**, not added.
- **−4 tests** — four tests in `domain/cards/{multipleChoiceForm,orderingForm,recallForm,writeCodeForm}.test.ts` called `legacyMcqCardToForm`, `legacyOrderingCardToForm`, `legacyCardToForm` and `legacyWriteCodeCardToForm`, which were **deleted with the v1 card model**. They passed because `expect(() => undefinedFn()).toThrow()` is satisfied by the `ReferenceError`. They asserted nothing and were removed, not ported — the first thing typechecking core's tests found (§15).
- Everything else moved verbatim. 29 of the 35 former `apps/web/src/domain` test files now run from `packages/core`; the 6 `save*Card.test.ts` files stayed in the web app because they drive a real Dexie-backed `getRepository()`.

**Root `npx vitest run` discovers the core suites with no config change** — `packages/core` is not under `node_modules/`, so Vitest's default `include` reaches it. Verify by file count after any config change: 38 core + 55 web = 93.

**828 was the count before it.** The workspace step added exactly 3, in one new file: `apps/web/src/types/coreSurface.test.ts` asserts that `@itera/core` resolves as a workspace package from the web app, that the `@/types` shim re-exports the *same function reference* rather than a copy, and that `richText` still produces the unchanged `RichContent` shape. **No existing test moved, was renamed or was edited** - only type modules relocated, and the shim keeps every `@/types*` specifier valid. Non-vacuity was checked: rewriting the shim to redefine `richText` fails the identity case.

**825 across 90 files was the count before it.** The P2-B pass added 35 across four new files: `apps/web/src/data/dexie/reviewTransaction.test.ts` (9 - commit and revert against the real Dexie transaction over fake-indexeddb, with forced failures at either store, a duplicate log id, and unrelated data checked untouched), `apps/web/src/data/supabase/reviewRpc.test.ts` (9 - the `commit_review`/`revert_review` call contract, that a commit issues **no** table writes at all, error rejection, and idempotency on a repeated commit), `apps/web/src/features/review/reviewPersistFailure.test.tsx` (9 - the whole failure UX through the real session: no advance, friendly alert, no raw backend text, retry of the identical result, no duplicate submission, and completion Undo including a failed undo), and `packages/core/src/domain/review/reviewPersistFailure.test.ts` (5 - copy that matches the guarantee and never leaks backend vocabulary), plus 3 phase-machine cases. Anti-vacuity was checked both ways: replacing the Dexie `rw` scope with two bare awaits fails 3 of the transaction cases, and restoring the pre-fix "dispatch GRADED then fire-and-forget" ordering fails 5 of the 9 UI cases.

**790 was the count before it.** The P2-A pass added 40 across two new files and three existing ones: `apps/web/src/components/ui/dialogs.test.tsx` (14 - focus entry per dialog kind, Tab/Shift+Tab wrap, containment against a background control, focus return on cancel/Escape/confirm/alert, a vanished opener, and the unchanged promise results) and `apps/web/src/lib/download.test.ts` (8 - anchor in the document at click time and a deferred `revokeObjectURL`, on fake timers), plus 8 `collectionPathFor` cases in `collectionTree.test.ts`, 7 in `RequireAuth.test.tsx` and 3 in `LoginPage.test.tsx`. Each set was run against the unfixed module first: 9 of 14 dialog cases, 2 of 8 download cases, 6 of 9 auth cases and 4 of 8 cycle cases fail there, the cycle ones by not terminating at all.

**750 was the count before it.** The Supabase pagination fix added 57 across three new files in `apps/web/src/data/supabase/` — `SupabaseRepository.reads.test.ts` (the pagination edge matrix, the review-log and card read semantics, and the later-page error contract), `backupCompleteness.test.ts` (the real `exportBackup` against a row-capped cloud repository), and `backendParity.test.ts` (the same dataset read through a real `DexieRepository` and a capped Supabase one, compared outright) — all driven by the chainable fake client in `packages/core/src/data/supabase/fakeSupabaseClient.ts`, which simulates a project **Max rows** cap of 3. Reverting the loop to the naive "stop on a page shorter than requested" termination fails 24 of the 31 cases in the reads suite.

**693 was the count before it.** The auth-mode fix added 7: five in `apps/web/src/auth/RequireAuth.test.tsx` and two in `apps/web/src/features/login/LoginPage.test.tsx`, all in new Supabase-mode blocks. They are the first tests in the repo to exercise the Supabase branch at all - the suite blanks `VITE_SUPABASE_*`, so both files mock `@/data/supabase/client` with `isSupabaseConfigured` as a **getter**, which lets one file render both modes because `AuthProvider` reads the flag during render rather than at module scope. Existing local-mode tests are untouched and the mock defaults to local. Run against the pre-fix `AuthProvider`, 3 of the 7 fail, including the audit's own stale-session reproduction.

**686 was the count before it.** The calendar-day fix added 49 across three new `*.dst.test.ts` files (`calendarDay.dst.test.ts`, `streak.dst.test.ts`, `dstMetrics.dst.test.ts`), each pinning `Europe/Belgrade` in-file through `packages/core/src/test/timeZone.ts` and asserting the pin took effect before testing anything. Run against the pre-fix modules, 21 of their 30 cases fail, including the audit's own streak reproduction.

**637 was the count before it.** The replace-import fix added 49 across three new files (`apps/web/src/data/dexie/replaceAll.test.ts` — the transaction-rollback regression suite, `packages/core/src/domain/io/importFailure.test.ts`, and `apps/web/src/data/supabase/SupabaseRepository.test.ts`, the first test in that directory) plus Draft/Roadmap validation cases and full-workspace round-trip/merge cases in the existing backup suites.

**588 was the count before it.** The QA cleanup pass added 19 across two new files (`retentionChartPath.test.ts`, `id.test.ts`) plus additions to the retention-chart, streak and Progress suites: isolated retention buckets in every gap position, day-count pluralization, and both `newId()` branches.

**569 was the count before it**, across 73 files, up from 535 across 68 files. Milestone 3 added 34 tests across five new files: pre/post scheduling-state logging, mature-retention examples, the canonical Learned helper, current/period KPI definitions, actionable leaf-deck rows, ReviewLog backup validation, the Dexie history reset, KPI presentation, and retention-chart gaps.

**535 was the count before it.** Milestone 2 added 110 tests for the canonical streak, the Today statistics boundary, page states, Adjust session, the nav badge, `limit`, and the Review queue snapshot.

**425 was the count before it.** Earlier revisions of this section carried two contradictory numbers (390 and 451); 390 was the measured count immediately after the single-card-model pass, and 451 was a stale carry-over from before it. Both are superseded. The single-card-model pass had brought the count down from 432 by deleting the migration and CardState suites outright (their subjects no longer exist) and removing the six per-type "migrates a legacy v1 card" cases plus the legacy form-hydration cases — not a coverage loss, since none of that code remains. The MVP integrity cleanup then added 35: backup entity validation, deck-reference validation across Merge/Replace, and the account-menu placeholder/identity assertions.

Older counts quoted in [`itera-decisions.md`](itera-decisions.md) (429, 445, 447) remain historical, because that log is append-only.

**The `MatchingEditorShell.test.tsx` timeout reported in an earlier audit does not reproduce.** Three full `npx vitest run` passes on 2026-08-18 (one before this milestone's changes, two after) completed in 36.0s, 35.5s and 54.7s with zero failures and no timeout; the slowest was simply a busier machine, and no individual test approached its limit. No test-timeout value was changed, and Vitest's global timeout was not raised. **The unidentified single-run flake noted on 2026-08-17 resurfaced once on 2026-08-22** — one test in one full run failed while the other **eight** full runs that day (two before it, six after) were clean at 588/588. Its name was lost to a truncated console capture, which is the whole reason it is still unidentified: **when a run fails, capture the complete output, not the tail.**

Timezone-sensitive tests are named `*.dst.test.ts` and pin `Europe/Belgrade` **in the file** via `packages/core/src/test/timeZone.ts` (which moved there with the stats tests that use it) (`process.env.TZ` set at module scope, restored in `afterAll`, offsets asserted first so a pin that failed to apply cannot pass silently), importing the modules under test dynamically so the pin precedes any module-scope `Intl.DateTimeFormat`. No timezone package was added and `vitest.config.ts` is unchanged.

Test conventions: colocated `*.test.ts(x)`; the suite is hermetic (`environment: 'node'` globally, `VITE_SUPABASE_*` blanked so tests always hit Dexie via `fake-indexeddb`); `globals` is **not** enabled, so every file imports `describe`/`it`/`expect` from `vitest` explicitly. Component tests opt into a DOM per file with `// @vitest-environment happy-dom` as line 1 **and must add their own `afterEach(() => cleanup())`** — RTL's auto-cleanup never registers without `globals`.

## 17. Exact recommended next milestone

**M-PARITY-1A - the mobile Demo runtime is now Repository-backed (§31) - is implemented in code and awaits the owner's physical-device confirmation.** It is an architectural convergence milestone with, by intent, almost no learner-visible difference: demo entities moved out of React state into a mobile-owned `InMemoryRepository` registered through the shared `configureRepository()`, screens read them through the shared query hooks, Review writes go through `commitReview`/`revertReview`, and the demo's parallel collection model was replaced by canonical `Deck.parentId` with Collections derived through core's `collectionTree`. M-DEMO-3, M-DEMO-4 and M-DEMO-5 remain in the same pending-device state and share that pass.

**Mobile authoring is reopened and approved.** D416 deferred it on the reading that Itera's early story is desktop authoring plus mobile review; physical-device testing found the absence of New Deck and Add Card to be a major product gap, and the audit behind this milestone rated the create-material journey as the one broken journey in the app. D421 supersedes D416's authoring half. **Its cloud half stands: Supabase, sync and durable persistence remain deferred until after market validation.** The distinction being held is between user capability ("I can create a card") and persistence infrastructure ("my card survives a reinstall"); the first is required now, the second is not.

**M-PARITY-1B is implemented (§32) and awaits the owner's physical-device confirmation.** What follows described it before it was built and is kept for its reasoning:

> **The recommended next milestone is M-PARITY-1B: Deck CRUD plus Recall and Multiple Choice authoring on mobile.** New Deck (All Decks and inside a Collection), deck rename and description, delete deck behind web's non-empty guard, the deck and card row kebabs restored with real items, Add Card with the six-type chooser enabling Recall and Multiple Choice, Edit Card, Delete Card, and a live preview through `ReviewSessionScreen` in `mode: 'study'`. It is unusually low-risk semantically because `packages/core/src/domain/cards/` already owns every form model, every validator and every save path, and `saveXCard` takes the repository as its first parameter: **no native save logic may be written**, only native fields bound to the shared modules, exactly as the six Review Views bind shared behaviors. M-PARITY-1A removed the remaining structural obstacle, so this is now presentation work over a settled seam. Mobile has no shared UI primitive layer (no Button, Field, Dialog or generic sheet), and building a small one is part of the milestone.

Two things in that paragraph were decided differently once built, both recorded in §32: card management went to the deck row rather than to Card study (D430), and **the in-editor live preview was not built** - a card can be inspected through Card study immediately after saving, and a preview pane inside a 390-point form is a design question this milestone did not open.

**The recommended next milestone is now M-PARITY-2: Write Code and Ordering mobile authoring, plus the remaining basic Card CRUD parity** (Duplicate, Move, Suspend and the restored deck Insights tab). Then **M-PARITY-3** (Matching and Walkthrough, the two hardest editors at 390px; the form logic and its mutation helpers are already shared and unit-tested, so the cost is layout). Matching authoring belongs to master-plan **Phase 9**, not Phase 8 - Phase 8 is Progress.

Deliberately **not** recommended ahead of them: mobile Review History and a Progress deck drill-down (real gaps, but the demo already tells its statistics story), Import/Export (master-plan Phase 10, and it needs `expo-file-system`/`expo-document-picker`), the notifications backend, offline SQLite and sync (Phase 11, whose semantics are a decision rather than an implementation detail), and anything cloud.

Collection/Deck Phase G and the Roadmaps reskin remain later candidates. Neither should be folded into mobile work implicitly: Phase G is a real data-model migration and Roadmaps is deliberately outside the primary MVP navigation.

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
- Retained with no caller, on purpose: `apps/web/src/hooks/useDrafts.ts` (+ `repo.drafts`, the Dexie store, and `drafts` in backup import/export). The drafts *UI* was deleted; the *data* was not. See §15.
- Deleted for good (do not resurrect): `Sidebar.tsx`, `BottomNav.tsx`, `navItems.ts`, `PageHeaderOverride.tsx`, `TodayShell.tsx`, `CreateMenu.tsx`, `ProfileMenu.tsx`, `SettingsPage.tsx`, `apps/web/src/auth/LoginPage.tsx`, `CardDetailPage`.
- **Deleted 2026-08-17 with the v1 legacy surface** (do not resurrect): the `/browse`, `/cards/new`, `/drafts` and `/stats` routes and their pages; `apps/web/src/features/cards/{registry,renderers}/` (all 8 families), `CardRow.tsx`, `CardTypeBadge.tsx`, `CardView.tsx`; `apps/web/src/features/{dashboard,decks,drafts,stats}/` entirely; `apps/web/src/features/review/{ReviewSession,GradeBar,useReviewSession}`; `apps/web/src/components/ui/FlipCard.tsx`; `apps/web/src/components/layout/ThemeToggle.tsx`; `apps/web/src/components/code/{CodeBlockField,lineRanges}`; `packages/core/src/domain/grading/normalize.ts`; `packages/core/src/domain/stats/computeStats.ts`; `apps/web/src/features/cards/{CardRowV2,shared/InteractionTypeBadge}.tsx`; and the entire `design-preview/library-{browser,deck,shared}/` fork.

## 19. Visual system status

Status only. Usage rules — families, weights, scale, icon conventions, the orange rule, portal mechanics, the full token and radius tables — are owned by [`design-system.md`](design-system.md).

**Typography — implemented.** Inter and JetBrains Mono are self-hosted variable webfonts via `@fontsource-variable`, imported at the top of `apps/web/src/index.css` and bundled by Vite, so the offline PWA has them cached rather than falling back to `system-ui`. That last clause is only true because `apps/web/vite.config.ts` sets `workbox.globPatterns` explicitly: workbox-build's default glob is js/css/html, so until the P2-A pass all twelve `.woff2` files and the Today hero's PNG mask were emitted but never precached (audit 2026-08-22). The precache manifest is now 24 entries and is the thing to check after any asset-pipeline change. Inter is the app-wide non-code default; `--font-itera-sans` and the compatibility `--font-itera-display` token both alias `--font-sans`. (The `--font-itera-mono` alias was deleted — it had no consumers; code surfaces use `font-mono`.) **Gap:** the intended type scale is **not** wired into CSS vars — components use literal Tailwind utilities and match the scale by eye.

**Icons — implemented.** `lucide-react` remains the only icon library, at a single version. The small one-off SVG exceptions are the bracket motif and logo-derived watermark inside `SuggestedSessionHero.tsx`, plus `StreakFlameIcon.tsx`: one shared brand glyph added because Lucide's thin generic flame did not match the locked Progress reference at nav/KPI sizes.

**Tokens — implemented, light-only, and now mirrored as shared values.** Two systems layer in `apps/web/src/index.css`: the general tokens (`:root, [data-theme='light']`), and an additive `.itera-scope` namespace applied through `IteraSurface`. The Itera scope defines the locked `--itera-*` palette **and re-points the general tokens to Itera values inside the scope** — that re-pointing is the compatibility mechanism by which every pre-existing component reskins with zero edits, so do not "simplify" it away. There is no dark palette, and the unreachable `[data-theme='dark']` block plus the inert `dark` custom-variant have been deleted (see §4).

**Shared UI foundation — implemented:** `Button`, `Field`, `FloatingPanel`, `dialogs` in `apps/web/src/components/ui/` (the v1 `FlipCard` is deleted; `reviewV2/components/FlipCard.tsx` is the only one); `RichText`/`InlineText`; `LazyCodeView`/`LazyCodeEditor`; `cn()` and `newId()` in `apps/web/src/lib/`. **`RichText`/`InlineText` are renderers, not parsers** — since Step 1.6 the syntax lives in `packages/core/src/content/` and these map its semantic nodes onto DOM elements, so a future native renderer inherits the same interpretation. The locked palette likewise exists as `packages/core/src/design/tokens.ts` alongside `apps/web/src/index.css`, with `apps/web/src/design/tokenDrift.test.ts` keeping them identical in both directions. Contracts and props are in [`design-system.md`](design-system.md) §3; the hand-built-on-purpose rule (no markdown, chart, graph or popover dependency) is in [`architecture.md`](architecture.md).

## 20. Visual-reference workflow

Reference mockups are **not tracked in this repository** — there is deliberately no `docs/references/` directory. They live at `C:\Users\SK\Desktop\itera-mockups\`, and [`design-system.md`](design-system.md) §14 defines the LOCKED / DIRECTION / CONCEPT tiers, the two standing exceptions, and the browser-verification requirement. Read it before implementing against any image.

## 21. Where the rest of the documentation lives

[`README.md`](README.md) is the index and states the source-of-truth hierarchy. In short: **the repository outranks every document**, this file outranks the reference docs on questions of status, and everything under [`archive/`](archive/) is history that never overrides a canonical doc.

## 22. TODO

- `supabase/migrations/0002_single_card_model.sql` needs running in the SQL editor. It's destructive by design and drops card_states before cards (that FK cascades).
- `supabase/migrations/0003_review_log_state_before.sql` needs running after 0002. It deliberately deletes prototype ReviewLog history before enforcing required `stateBefore`; no live Supabase project has verified it yet.
- `supabase/migrations/0004_review_commit_rpc.sql` needs running after 0003. It is additive (two functions plus their `execute` grants, nothing dropped or deleted), but cloud review persistence depends on it: without the functions, every grade and every undo fails loudly in cloud mode rather than writing partially. Not yet verified against a live project — [`TODO.md`](TODO.md) lists what to check.

---

## 23. Mobile composition, authentication and data (milestone M1A)

**Implemented in code and gate-clean. Not yet verified against a live Supabase project or a physical device.** No live project exists (see §15), so every claim below is an assertion about the code and the automated suite, not about real Postgres.

### What exists

| Piece | Where | Notes |
|---|---|---|
| Composition root | `apps/mobile/app/_layout.tsx` | The counterpart of `apps/web/src/main.tsx`, and the only module that decides what the app is made of. Registers the repository, binds focus, then provides Query → Auth → Router. |
| Native Supabase client | `apps/mobile/src/data/supabaseClient.ts` | The **only** mobile module that reads configuration (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, read as static member expressions so Expo can inline them). `detectSessionInUrl: false`; `AppState` drives `startAutoRefresh`/`stopAutoRefresh`. |
| Session storage | `apps/mobile/src/data/secureSessionStorage.ts` + `chunkedValue.ts` | SecureStore with manifest-plus-chunks, per master plan D4. A Supabase session exceeds the historical ~2048-byte keychain ceiling, so one logical value spans N numbered keys. Chunks are written before the manifest and stale chunks are dropped after it, so an interrupted write is never half-readable and a shorter value cannot leave orphans. An incomplete set reads as signed out and self-cleans. |
| Auth config | `apps/mobile/src/auth/mobileAuthConfig.ts` | Always Supabase mode — mobile is cloud-only, so backend and auth mode cannot disagree by construction. `localSessionStore` is deliberately **inert**: core never reads it in Supabase mode, and an inert store means there is no native local record that could become a second way to be authenticated (audit P1-3). |
| Auth engine | `packages/core/src/auth/` (unchanged) | Mobile reimplements nothing. `resolveAuthState`, `createAuthEngine`, `AuthProvider` and `useAuth` are shared verbatim. |
| Sign-in | `apps/mobile/src/components/auth/SignInScreen.tsx`, `app/(auth)/sign-in.tsx` | Six-digit email OTP: `signInWithOtp` then `verifyOtp`. **Functional infrastructure, not a designed surface** — existing tokens, one field, one action. Web's magic-link flow is untouched; the two platforms differ in sign-in interaction and share session semantics, exactly as §5 always intended. |
| Error copy | `apps/mobile/src/auth/authErrorCopy.ts` | The one place a raw auth error is looked at. Classifies by status/code and returns one of six fixed sentences; GoTrue wording, URLs and transport text can never reach a learner. |
| Route protection | `apps/mobile/src/composition/RootNavigator.tsx` | Two mechanisms: no navigator at all while the bootstrap runs (so there is no frame of the wrong screen), then `Stack.Protected` groups that **remove** the other group rather than redirecting away from it. Expo Router restores a requested route once its guard opens, so no redirect parameter is needed. |
| Query client | `apps/mobile/src/composition/queryClient.ts`, `appStateFocus.ts` | One client. `retry: 1` and `refetchOnWindowFocus: true` differ from web because the platform does, not because the product does. `focusManager` is bound to `AppState`; `onlineManager` deliberately is not (see below). |
| Repository composition | `apps/mobile/src/composition/composition.ts` | `configureRepository(() => new SupabaseRepository(getMobileSupabase()))`, called once at module scope in the composition root. Lazy: importing it opens no connection. |
| Account identity + Sign out | `apps/mobile/src/components/profile/ProfileSettingsScreen.tsx` | Real session email over "Synced with Supabase". The fabricated "Demo workspace" line is gone. Sign out does not navigate — clearing the session closes the guard. |
| Development probe | `apps/mobile/app/(app)/diagnostics.tsx` | `__DEV__`-only, off the tab bar, reachable only from a Profile row that renders only in development. Reads decks and creates/deletes one disposable deck through the ordinary shared hooks, and shows the session user id so RLS ownership can be checked in the Supabase table editor. Deliberately **not** wired into Today/Library/Progress: mixing real and fixture values on a reviewed surface is the dishonest half-state this milestone exists to avoid. |
| Test suite | `apps/mobile/jest.config.js`, 5 files, 50 tests | `jest-expo` + React Native Testing Library, separate from the root Vitest suite with zero overlapping assertions (master plan D10). |

### Route structure

```
app/_layout.tsx              composition root; Stack with two Protected groups
app/index.tsx                entry redirect: /today or /sign-in
app/(auth)/sign-in.tsx       six-digit OTP
app/(app)/(tabs)/...         the five-item shell, unchanged
app/(app)/card/[cardId]/study.tsx  card study preview (M-DEMO-4, §27)
app/(app)/notifications.tsx  unchanged, now with real stack presentation
app/(app)/diagnostics.tsx    __DEV__ only
```

Group segments do not appear in a URL, so **every existing path is unchanged** (`/today`, `/library`, `/library/deck/[deckId]`, `/review`, `/progress`, `/profile`, `/notifications`) and no existing `router.push` was touched. The root layout is now a `Stack` rather than a `Slot`, which is what the Protected API requires and which also gives `/notifications` a real push transition and the iOS back-swipe it previously lacked.

`apps/mobile/src/composition/` is **not** named `src/app/`: Expo Router treats `src/app` as an alternative app directory, and a second route root there silently pulled test files into the bundle graph.

### What is deliberately NOT here

- **A native RichText renderer.** The review screens still consume hand-tokenized presentation fixtures, so they cannot render arbitrary real `Card` content. This is milestone M1B, and the native content-security item in [`TODO.md`](TODO.md) stays open and un-actionable until it lands.
- **Review persistence.** No queue, no `reviewService.submit`, no `commitReview`. Milestone M1C.
- **Real product data** on Today, Library and Progress. Those screens are untouched and still fixture-backed.
- **Import / Export**, card authoring, notifications backend, offline storage and sync.
- **An `onlineManager` connectivity binding.** Without a connectivity module React Native reports permanently online, which for a cloud-only client with no offline layer is the honest behaviour: a request made with no signal fails and surfaces as an error rather than being queued against a cache that does not exist. Wiring real connectivity belongs with the offline milestone that would give a paused query somewhere to wait. No dependency was added for it.

### Local-only web workspaces do not appear on mobile

Mobile is cloud-only by decision (master plan D11). A learner using the web app in local Dexie mode has a workspace that exists only in that browser, and signing in on the phone will show an empty account rather than that data. The sign-in screen says so in one line. Migrating browser-local data into a cloud account remains the open product question already recorded in [`TODO.md`](TODO.md).

### Gates

```
apps/mobile: npx jest                       -> 5 suites, 50 tests, passing
apps/mobile: npx tsc --noEmit               -> clean
apps/mobile: npx expo lint                  -> clean
apps/mobile: npx expo-doctor                -> 18/18
apps/mobile: npx expo export --platform ios -> bundles (4.16 MB hbc)
root:        npx vitest run                 -> 111 files / 1064 tests (unchanged)
root:        npx tsc -b --force             -> clean
root:        npm run lint                   -> clean
root:        npm run build                  -> successful, PWA precache 24 entries
npm ls react / @tanstack/react-query / @supabase/supabase-js -> one deduped copy each
```

The iOS export is the strongest static evidence available without a device: it proves the whole graph — `@supabase/supabase-js`, `expo-secure-store`, `@itera/core` with `ts-fsrs`, the shared auth engine, the repository and the hooks — resolves and compiles under Metro/Hermes, and that no `import.meta` survives into a native bundle.

---

## 24. Mobile demo mode (milestone M-DEMO-1)

**`apps/mobile` defaults to an explicit, deterministic Demo mode.** The project owner has made market validation the priority: the goal is a coherent, functional demo to show potential users and gather demand, and only then to decide whether to invest further in production cloud infrastructure. The cloud/Supabase path built in M1A (§23) is intact, unchanged and **still unverified**, and is deferred by that product-owner decision.

**Demo data is not production persistence.** It is deterministic demo data for an interactive demo, reproducible screenshots and physical-device UI testing. It is never synced, cloud-backed, a persisted account or production data. It is held in memory and resets on a full app restart, deliberately (D369). Supabase integration is intentionally postponed until after demand validation; nothing about it was started here (D376).

Device verification of demo mode is **pending the owner** and is not claimed.

### Two runtime modes

| | Demo (default) | Cloud (`EXPO_PUBLIC_ITERA_MODE=cloud`) |
|---|---|---|
| Supabase configuration | not required, not read | required; the M1A configuration notice is unchanged without it |
| Sign-in | none; authenticated on the first frame | six-digit email OTP, unchanged |
| Repository | **not registered** - an accidental `getRepository()` throws | `configureRepository(() => new SupabaseRepository(...))`, unchanged |
| Data | the demo workspace | none wired into product screens yet (§23) |
| Network | no cloud request is made | as M1A |
| Diagnostics probe | refuses to render, and says why | `__DEV__` only, unchanged |
| Profile | "Demo workspace", no Sign out (there is no account) | real session email, Sign out, unchanged |

### What exists

| Piece | Where | Notes |
|---|---|---|
| Runtime mode | `apps/mobile/src/config/mobileRuntimeMode.ts` | One value, resolved once from a static `process.env.EXPO_PUBLIC_ITERA_MODE` member expression so Expo can inline it. Only the exact string `cloud` selects cloud; anything else is demo, so a half-configured build is never mistaken for a cloud build. The composition root reads it for both the repository and auth, so the two cannot disagree. |
| Demo session | `apps/mobile/src/auth/demoSessionStore.ts` | Core's own `LocalSessionStore`, pre-seeded with one `kind: 'demo'` record. Core leaves `loading` false in local mode and reads the store during construction, so the app is authenticated on its first rendered frame with no OTP and no bootstrap. `write`/`clear` are inert. **`RootNavigator`, `AuthProvider` and the `Stack.Protected` groups were not modified.** |
| Demo workspace | `apps/mobile/src/demo/demoWorkspace.ts` | One dataset: 4 collections, 8 decks (one unfiled), 18 cards across 3 decks, 7 notifications. Mobile-only; nothing was added to `@itera/core`, and it is deliberately **not** a `Repository` implementation. |
| Selectors | `apps/mobile/src/demo/demoSelectors.ts` | Pure derivation, no React and no navigation, so route files stay thin bindings and the rules are testable. Test files may not live under `app/` (D356), so logic worth proving lives in `src/`. |
| Demo state | `apps/mobile/src/demo/demoWorkspaceContext.ts`, `DemoWorkspaceProvider.tsx` | Cards/scheduling, seeded + current ReviewLogs and notification read state live in one provider and react across screens (§25, §26). `useDemoWorkspaceOptional` exists for the header, which also renders in cloud mode. A `__DEV__` reset helper; no product reset control. |
| Sort and filter | `apps/mobile/src/components/library/deckSorting.ts` | Calls core's `sortDecks` verbatim, so all four keys mean what they mean on web. Filtering is web's order: due-only, then case-insensitive search over name and description, then sort. |
| Native sheets | `SortSheet.tsx`, `CardStatusSheet.tsx`, `cardFiltering.ts` | React Native's own `Modal`, existing tokens, no new dependency and no desktop dropdown. |
| Not-found state | `apps/mobile/src/components/library/LibraryNotFoundScreen.tsx` | What a Library route renders when its id names nothing, built from the existing back row and empty-state card. |

### The derivation rule

- **Derived from the demo card list**: card counts, due counts, mastery, last studied, collection totals, Today's due total, Today's estimated minutes. Two screens can no longer disagree about the same deck. `demoWorkspace.test.ts` fails if they do.
- **Review-history metrics were deferred by M-DEMO-1 and are now superseded by M-DEMO-3 (§26)**: the demo seeds canonical ReviewLogs and derives streak, retention, activity, retention series, milestones and period reviews through core.

Deck ids are now canonical. One deck previously had three (`fixture-distributed-systems` in Library, `fixture-systems` in Today - which was also a collection id - and `fixture-systems-distributed` in Progress) and four different card counts.

### What became functional

Library navigation, search, filter and sort are functional **over the demo workspace** - not over real data, which remains master plan Phase 6.

- All Decks rows are `Pressable` and open their own deck. They were a plain `View` with no press handler at all, so the only route into a deck screen in the whole app was one hard-coded row on the Collection screen.
- `/library/deck/[deckId]` and `/library/[collectionId]` resolve their parameter. Both previously ignored it: every deck link showed Modern C++, and every collection link that was not Languages & C++ showed Interview Core. An unknown id now gets a not-found state.
- Every collection scope resolves, including Unfiled, Systems and Research, which were disabled. Every scope has demo content.
- Every Collection deck row opens its own deck, not just the one hard-coded to `fixture-modern-cpp`.
- Today's Continue Learning rows open the matching deck. They all routed to `/library`.
- Progress's Deck performance rows open the matching deck. They were plain `View`s.
- Sort works and reports the **active** sort; it read "Sort: Last studied" while nothing was sorted.
- The deck card filter really filters by status and defaults to showing everything; it previously re-set `newOnly = true` and opened with a filter nobody had chosen.
- Notification read state is coherent: the bell dot reflects the real unread count, and "Mark all as read" is reachable when only Earlier has unread items.
- Notification rows open the deck they name, or mark read only and say so.

### What is deliberately NOT here

- **Any Supabase or live-cloud work.** No project, no `schema.sql`, no OTP, no RLS check, no shared-`Repository` data on Today/Library/Progress, no cloud metric. The `TODO.md` live-Supabase/M1A checkpoint and the three unverified-migration items are preserved.
- **Real product data.** Every product screen still reads the demo workspace.
- **Persistence for demo state.** No AsyncStorage, no SQLite, no dependency (D369). This is a decision, not debt.
- **Review session work.** No queue, no native RichText, no FSRS intervals, no grade persistence, no Undo. The interaction previews are untouched.
- **CRUD and authoring.** New Deck, Import, Export, Study Now, Add card, rename/delete/duplicate/move/suspend and Collection settings remain visibly disabled.
- **Real Progress calculations were not part of M-DEMO-1.** Shared calculations are now connected in M-DEMO-3 (§26).
- **A redesign.** Visual language, tab layout, Today hero, compositions, typography, colours and card geometry are unchanged apart from what representing interactive and disabled states honestly required.

### Removed

**Deck favorites.** Mobile-only, component-local, with no web equivalent - no `Deck` field, hook, mutation, filter or sort key exists in `apps/web/src` or `packages/core/src` - and no decision approving it. Removed rather than kept as an invented feature (D373). The Collection deck row's overflow glyph was also removed: a bare icon in a `View`, indistinguishable from a control once the row itself navigated.

### Gates

```
apps/mobile: npx jest                       -> 14 suites, 140 tests, passing (was 5 / 50)
apps/mobile: npx tsc --noEmit               -> clean
apps/mobile: npx expo lint                  -> clean
apps/mobile: npx expo-doctor                -> 18/18
apps/mobile: npx expo export --platform ios -> bundles (4.18 MB hbc)
root:        npx vitest run                 -> 111 files / 1064 tests (unchanged)
root:        npx tsc -b --force             -> clean
root:        npm run lint                   -> clean
root:        npm run build                  -> successful, PWA precache 24 entries
```

No `apps/web` or `packages/core` file was modified.

---

## 25. Mobile demo Review session (milestone M-DEMO-2)

**Review is a real local study session on the phone.** From Today or the Review tab a learner starts a session over the demo workspace, answers all six interaction types, receives objective feedback, chooses a final FSRS rating, progresses through a queue, finishes, and sees the workspace react. Everything that decides an outcome is shared with web; everything that differs is presentation.

**It is local and in memory.** No `Repository` is called, no Supabase is required, nothing is written to Dexie, SQLite or AsyncStorage, and the session resets on a full app restart. That is a market-validation decision (§24), not technical debt. **Cloud persistence remains deferred until after market validation.**

Device verification is **pending the owner** and is not claimed.

### Native content rendering

`parseRichText` / `parseRichInline` (core) → shared semantic nodes → `apps/mobile/src/components/text/RichTextNative.tsx`.

The renderer parses nothing and imports no regex, exactly as `apps/web/src/components/text/RichText.tsx` does not. It maps `paragraph`/`code` blocks and the four inline kinds onto React Native elements; `NativeCodeBlock.tsx` draws fenced blocks with line numbers, and `stripInlineMarkers` (core) is the one accessible-name flattening. The hand-tokenized `parts[]` / `codeLines[]` view models in `apps/mobile/src/types/review.ts` — a second content model no real `Card` could produce — are **deleted**, along with the six `src/fixtures/review*.ts` files.

**One deliberate loss of fidelity:** the preview screens coloured code per token from hand-authored `tone` values. No shared tokenizer exists that could produce those from a `code` node, and master plan D5a names a WebView CodeMirror an escape hatch rather than a default, so native code blocks are literal monospace text with line numbers until a shared tokenizer exists. Recorded, not silently regressed.

### Native content-security regression — complete

`apps/mobile/src/components/text/richTextSecurity.test.tsx` drives core's own `packages/core/src/test/attackPayloads.ts` (a test-only deep import, the same deliberate exception `backendParity.test.ts` uses) through the native renderer. Every payload renders as literal visible text at block level, inline level and inside fenced blocks; every `MUST_SURVIVE_LITERALLY` string (`Vec<T>`, `a < b && c > d`, `snake_case_identifier`) comes back byte for byte.

Native sinks were audited rather than assumed safe, because "React Native does not execute DOM HTML" is not the same as "there is no sink":

| Sink | Result |
|---|---|
| `Linking.openURL` | Absent from the whole component tree, and a source scan fails the build if one appears. The node union has no `url` node, so a renderer cannot be handed one. **No link support was introduced.** |
| `WebView` | Not a dependency, not imported, scanned for. |
| `Image` source URI | The one URL sink in the card model is `WalkthroughInteraction.image`. `SafeCardImage.tsx` renders it **only** when core's shared `isSafeImageSource` accepts it, and renders nothing otherwise. Every `REJECTED_IMAGE_SOURCES` entry is tested; a scan fails the build if any other module builds an `Image` source from data. |
| Style values | All styles are `StyleSheet` constants; nothing derives a style from card text. |
| Dynamic modules / network | None. No card string reaches a module name, a fetch or a socket. |

**No native content-security defect was found.** The standing `docs/TODO.md` item "Content security for a future native renderer" is therefore **closed** — it was explicitly not actionable until a renderer existed, and now one does and has had its pass.

### Demo Review architecture

```
DemoWorkspace (real Cards with real SchedulingState)
  -> createDemoQueue        due-only, most-overdue first, id tie-break, bounded, snapshotted per mount
  -> DemoReviewSession      position, per-card undo record, completion
  -> ReviewSessionScreen    phase machine, response, timing, FSRS preview, suggested rating
  -> InteractionBehavior    isResponseReady / autoGrade / widthFor, from @itera/core, never re-derived
  -> native Views           presentation only
  -> reviewService.submit   the one FSRS computation -> { after, log }
  -> applyDemoReview        in-memory write of that exact result
```

| Piece | Where | Notes |
|---|---|---|
| Real demo cards | `apps/mobile/src/demo/demoCardContent.ts` | All 18 demo cards are now real core `Card`s: an authored `CardInteraction` per card and an authored scheduling seed. Every id, deck, prompt and tag from M-DEMO-1 is unchanged, so the device-verified Library/Today/Progress numbers did not move (18 cards, 12 due; Algorithms 6/5, Compilers 6/4, Modern C++ 6/3). Content uses Itera's real text syntax, so the demo exercises the renderer itself. |
| Scheduling | `apps/mobile/src/demo/demoScheduling.ts` | The authored booleans `status` and `due` are **gone**: both are derived from `card.scheduling`. Seeds are day offsets resolved against the workspace's own `now`, so the dataset is deterministic per run and still correct against the real clock during grading. |
| Queue | `apps/mobile/src/demo/demoQueue.ts` | Due-only, ordered by due instant then `id` so a recorded demo repeats exactly, bounded at 20, optionally deck-scoped. Snapshotted at mount for the same reason web's `useSessionQueue` is. |
| Demo state | `DemoWorkspaceProvider.tsx` | Two new mutations only: `applyDemoReview` (writes `result.after` onto the card, appends `result.log`, idempotent by log id so a double press cannot record twice) and `undoDemoReview` (restores the **recorded** pre-grade state and removes exactly that log — FSRS is not invertible, so nothing is recomputed backwards). `now` travels with the workspace so the whole tree compares due dates against one instant. |
| Session shell | `ReviewSessionScreen.tsx` | No per-type logic. Mirrors web's shell semantically; the phase machine is native-side by the existing `ReviewPhase` rule in `architecture.md`, with four phases rather than five. |
| Registry | `interactions/registry.ts` | `{ ...<type>Behavior, View }` per type, `Partial` so a seventh type fails loudly. `registry.test.ts` asserts the binding **by reference**, so a hand-written copy of a behavior fails the build. |

### The six interactions

| Type | Status | Shared semantics used |
|---|---|---|
| Recall | working | `recallBehavior` (self-graded: no grader, nothing to check) |
| Multiple Choice | working | `multipleChoiceBehavior.isResponseReady`, `gradeMultipleChoice` |
| Write Code | working | `writeCodeBehavior.isResponseReady`, `.autoGrade` (the card's own comparison settings; nothing is executed or compiled) |
| Ordering | working | `orderingBehavior.isResponseReady`, `gradeOrdering` partial credit |
| Matching | working | `matchingBehavior.isResponseReady`, `.widthFor`, `gradeMatching` partial credit |
| Walkthrough | working | `initialWalkthroughState`, `gradeWalkthroughStep`, `walkthroughBehavior.isResponseReady`, `.autoGrade` — **one** rating and **one** ReviewLog for the whole card, never one per step |

Two Ordering defects were fixed on the way: the drag step was a hard-coded 82px, true of the five short fixture items and wrong for any wrapping real item (rows are now measured via `onLayout`), and reordering was reachable only through an `accessibilityAction` — always-visible up/down controls are now rendered, which master plan D7 requires because native has no equivalent of web's Space-arrows-Space. A third was found by the new tests: a learner who agreed with the presented order could never submit, because no response had been recorded; the presented order is now seeded exactly as Write Code seeds its starter code.

### Rating semantics

Itera's locked rule is unchanged: **objective correctness is not recall quality.** An auto-graded result *recommends* a rating using web's exact mapping (correct → Good, partial credit → Hard, otherwise Again), shown as a "Suggested" marker. Nothing is preselected, no other rating is disabled, and the session never advances on objective correctness alone. `ReviewLog.autoGraded` records whether the learner's choice matched the recommendation, exactly as web computes it. Rating buttons show **real** next-due intervals from `reviewService.previewNextStates` over that card's own state, replacing the four identical fixture strings every preview screen used to show.

### Entry, exit and navigation

- **Today** → "Start your next session" pushes `/review/session`. Continue Learning deck rows still open their deck; they were not overloaded.
- **Review tab** → `/review`, the entry screen. It no longer opens a card directly.
- **Session** → `/review/session`, immersive. `IteraTabBar` now hides the bar only when the focused nested route is `session`; it used to hide it for the whole Review tab, which made the tab a trapdoor.
- **Exit** → back to the origin (`canGoBack()`, else `/today`), not an unconditional replace to Today.
- The five dead per-type routes (`/review/{recall,ordering,matching,multiple-choice,write-code}`) are **deleted**.

### Demo reset

A `__DEV__`-only **Reset demo workspace** row on Profile, beside the existing diagnostics row. It rebuilds the deterministic workspace: original card scheduling, the original seeded ReviewLogs and restored notification state. `resetDemoWorkspace()` refuses again at runtime outside `__DEV__`. It is deliberately **not** on the caught-up Review screen, where it would read as a learner feature.

### What is deliberately NOT here

- **Any Supabase or cloud work.** No project, no schema, no OTP, no RLS, no `Repository` write. M1A is untouched.
- **A persist-failure state.** Demo writes are synchronous and cannot fail; fabricating retry UX would be dishonest. The awaited `onGraded` seam is where a cloud session adds web's `persistFailed` phase and identical-result retry.
- **Reactive Today/Progress was not part of M-DEMO-2.** It is now implemented separately in M-DEMO-3 (§26).
- **Library CRUD and authoring.** Unchanged and still visibly unavailable.
- **A Review redesign.** The six interaction Views keep their owner-approved layouts, styles, animations and accessibility; only their data source and their props changed.

### Gates

```
apps/mobile: npx jest                       -> 28 suites, 333 tests, passing (was 14 / 140)
apps/mobile: npx tsc --noEmit               -> clean
apps/mobile: npx expo lint                  -> clean
apps/mobile: npx expo-doctor                -> 18/18
apps/mobile: npx expo export --platform ios -> bundles (4.2 MB hbc)
root:        npx vitest run                 -> 111 files / 1064 tests (unchanged)
root:        npx tsc -b --force             -> clean
root:        npm run lint                   -> clean
root:        npm run build                  -> successful, PWA precache 24 entries
```

No `apps/web` or `packages/core` file was modified.

---

## 26. Reactive mobile demo statistics (milestone M-DEMO-3)

**Today and Progress now derive Demo-mode learning metrics from canonical Cards + ReviewLogs.** `createDemoWorkspace()` authors only what a learner does - which card, which local day, what time, which rating, how long - and **replays it through the shared FSRS scheduler**, relative to the current local day through core’s calendar helpers. That replay produces 56 canonical `ReviewLog`s over 12 of the 18 cards *and* the current `SchedulingState` of each of those cards, so a card and its own most recent log cannot disagree. The fixture spans 28 days with a visible activity pattern, real gaps, mature Review/Relearning attempts, two genuine lapses and usable durations. It gives the demo a **four-day current streak, 84% mature Retention, 12 of 18 Learned, 56 Reviews and 9 cards Due**, plus populated charts and derived milestones, before the learner reviews anything today. No authored dashboard number, and no authored scheduling state, remains beside the entities that determine it.

The runtime flow is now:

```
authored review inputs (card, local day, time, rating, duration)
  -> replayed through core reviewState + buildReviewLog
  -> canonical ReviewLogs AND each card’s resulting SchedulingState
DemoWorkspace Cards + seeded/current ReviewLogs
  -> @itera/core statistics and calendar semantics
  -> mobile Today / Progress / Library view models
  -> grade, Undo or reset updates the one provider value
  -> every mounted surface derives again immediately
```

Today uses shared `computeStreak`, `computeRetention`, `estimateSessionMinutes`, `computeDeckMetrics` and `buildContinueLearning`. **Today’s Retention is the trailing 30 calendar days**, built with core’s `buildRange` - the same window web’s `TodayPage` uses and the same one Progress’s KPI reads, so the two mobile surfaces cannot report different retention for the same day. Progress uses shared `computeKpis`, `computeHeatmap`, `computeRetentionSeries`, `computeDeckPerformance` and `deriveMilestones`. Learned is the canonical unique active reviewed-card count; Retention is mature Review/Relearning attempts with Hard-or-better success; Due is current active due cards. The 30D range is real and its label, Reviews, Retention buckets and heat-map window all share `buildRange`. The owner-approved mobile hierarchy still exposes only 30D; 3M/1Y remain visibly unavailable rather than pretending to work.

The native retention renderer now accepts null buckets, never joins across a gap, draws isolated observations as points and derives its vertical scale from the observed data. The visual composition is otherwise unchanged. Today pace remains omitted by the existing mobile hierarchy decision.

`applyDemoReview()` advances the card and appends the canonical current log; Today Due/Continue Learning, Progress Reviews/activity/deck performance and Library rollups react from that same state. Completion Undo restores the recorded SchedulingState and removes exactly its log; a duplicate Undo is an idempotent no-op. Reset rebuilds the workspace against its original anchor, restoring cards, seeded history and notification state exactly. Everything remains in memory and resets on app restart by decision. There is still no Repository, Supabase write, SQLite/AsyncStorage persistence, sync, Library CRUD, authoring or notification backend.

Mobile coverage is now **29 suites / 356 tests**. New wiring assertions cover seed integrity and relative dates, the fixture invariant that every reviewed card carries exactly the state its own latest log produced (state, `lastReview`, due, stability, difficulty, reps and lapses) and that every card without history is genuinely New, the 30-day Today-retention window proved against history deliberately older than that window, Today and Progress shared metrics, range boundaries, heat-map zeros/current activity, chart gaps/segments/singletons, deck performance, milestones, grade propagation, Undo, duplicate Undo and exact reset restoration. Core algorithms remain tested once under Vitest; mobile tests assert composition and rendering only.

Final M-DEMO-3 gates are clean: mobile Jest **29 suites / 356 tests**, mobile TypeScript, Expo lint, `expo-doctor` **18/18**, iOS export at **4.2 MB hbc**, root Vitest **111 files / 1,064 tests**, root `tsc -b --force`, root lint and the production web/PWA build (**24 precache entries**). The build retains its existing chunk-size advisory.

### Corrections applied after independent verification

An independent read-only verification pass over M-DEMO-3 found four issues that were fixed before the milestone was handed over. It also carried five minor findings unchanged (chart run/isolated duplication, the single-bucket chart edge, reset rewinding `now`, and two coverage gaps); none of those changes behaviour.

- **Root Expo contamination, reverted.** M-DEMO-3 had rewritten the repository-root `tsconfig.json` to `extends: "expo/tsconfig.base"` and left a generated root `.expo/` behind, which happens when Expo tooling is run from the repository root rather than from `apps/mobile`. The root config is restored to the four-project workspace solution it has been since Phase 2, and the stray `.expo/` is deleted. The root is deliberately **not** given a `.expo` ignore rule: `apps/mobile/.gitignore` already covers the legitimate one, so a future stray directory at the root stays visible as contamination instead of being silently ignored. `npm run dev:mobile` already delegates through `--workspace @itera/mobile`, and `expo-doctor` reports 18/18 from `apps/mobile` (and a spurious failure from the root, which is itself the point).
- **The demo fixture stopped asserting outcomes.** Six of the twelve reviewed cards previously carried an authored `SchedulingState` that contradicted their own most recent `ReviewLog` - a card claiming to be in learning while its last log said it had graduated - and three carried a `lastReview` that contradicted their latest log. Authored mature/learning scheduling is gone: `demoCardContent.ts` can now only author a **New** card, and every later state is produced by the replay. A fixture invariant test asserts state, `lastReview`, due, stability, difficulty, reps and lapses against each card’s last log, that untouched cards are genuinely New, and that each card’s logs chain end-to-end.
- **Today’s Retention window matches web.** It averaged all of history while Progress averaged thirty days, so the two agreed only while the fixture happened to fit inside the window. Today now uses core’s `buildRange('30d')`, and the regression test feeds it mature failures 40 and 45 days old whose ratings *would* change the all-time figure, then asserts Today reports 100% while all-time reports 50%.
- **The streak in this section was wrong.** It said three days; the seeded history has always produced four. The documentation was corrected, not the data.

The derived numbers moved because the old fixture was internally inconsistent, and the truthful values were taken: Due is 9 rather than 12, Reviews 56 rather than 25, Learned 12 of 18, Retention 84%. Recent milestones show a 3-day streak plus the 70%/80%/90% retention thresholds, three of which share a date because the first day of the replayed history was perfect - that is core’s `deriveMilestones` being honest about this history, and the fixture was deliberately not contorted to spread them.

Physical-device verification is **pending the owner** and is not claimed. Verify on iPhone: reset; inspect populated Today/Progress; note Due; review several cards; confirm Today, the relevant Continue Learning row, Progress Reviews/current-day activity/deck performance and Library due counts changed; Undo from completion and confirm the last change reverted; reset and confirm the starting state returned with no red screen.

No `apps/web` or `packages/core` file was modified. The only change outside `apps/mobile` and `docs/` is the restoration of the repository-root `tsconfig.json` described above.

---

## 27. Mobile Deck/Card browsing and deck-scoped Review (milestone M-DEMO-4)

**The Deck screen's two dead ends are gone.** Card rows open the card they name, and Study Now starts a session scoped to that deck. Both work over the same in-memory `DemoWorkspace` as everything else on mobile; nothing here is persisted, cloud-backed or an account.

### Card study / preview

`app/(app)/card/[cardId]/study.tsx` is the native equivalent of web's `/cards/:id/study` - a non-committing preview of one authored card, and (as on web, D69) the closest thing either platform has to a card detail view. It resolves its route parameter through `findDemoCard()`; an id that names no demo card gets the honest "Card not found" state rather than some other card.

It sits at the `(app)` stack level rather than inside the tabs, which is what gives it a native push transition and the iOS back-swipe, keeps the tab bar off an immersive card surface, and leaves the deck mounted underneath - so **back returns to the same deck with its search text and status filter intact**.

There is **no second card presentation**. `CardStudyScreen.tsx` binds the card to the existing `nativeInteractionFor()` registry and renders the existing `ReviewSessionScreen`, which now takes a discriminated `mode: 'review' | 'study'`. All six interaction types therefore work in study for the same reason they work in a session, through the same shared `InteractionBehavior`: `interactive`, `isResponseReady`, `autoGrade` and `widthFor` are used unchanged, so a Recall card reveals, Multiple Choice / Write Code / Ordering / Matching submit and show their objective feedback, and Walkthrough steps through and finishes.

**Study records nothing, and cannot.** In study mode the props that would carry a grade do not exist: there is no `schedulingBefore`, no `onGraded`, no `RatingControls`, no interval preview and no `reviewService.submit`. No `ReviewLog` is appended, no `SchedulingState` changes, and no due date moves. The screen says so from the first frame - a "Preview" badge in the header and a **"Preview only - nothing recorded."** panel - rather than after the learner has answered.

### Deck-scoped Review

Study Now pushes the **existing** `/review/session` route with a `deckId` parameter; there is one session route, one session engine and one completion screen. Scope means what it means on web: **that deck and its whole subtree**, resolved by core's own `subtreeIds` rather than by an equality check on this platform. Demo decks are flat (they carry a `collectionId`, never a `parentId`), so the resolved set is the deck itself today.

- **Unknown deck scope is refused.** `/review/session?deckId=` naming no deck renders "Deck not found". It never widens back out to every card, and it is never presented as a caught-up session for a deck that does not exist.
- **A deck with nothing due does not launch a session at all.** The Deck screen states it in the Study Now slot - *"You're caught up in this deck."*, or *"No cards to study yet."* for a deck with no cards. **No due date was moved to make Study Now look interesting**; five demo decks are honestly empty, and the three populated decks reach this state live once a scoped session is finished.
- The Review tab's own queue is unchanged: no `deckId`, every due card.

Session origin needs no parameter. Today, the Review tab and Deck all *push* the session, and both exits - the header exit and the completion screen's **Done** - go back to whatever pushed it. Deck-scoped completion therefore returns to the originating deck, and one-level Undo works there exactly as it does elsewhere, restoring the recorded pre-grade state, removing exactly its log, and moving the deck's own due count back with it.

### Deck metrics, card status and no-op controls

Deck numbers and card status labels were already derived from canonical `Card.scheduling` in M-DEMO-3 and were not touched: there is no deck-local counter and no presentation-only status field. A scoped session's grades propagate to the deck's due count, Library rollups, Today and Progress from the one workspace value, and Undo reverses all of them by reversing the data.

- The **card-row kebab is removed**, not disabled. Inside a dead row it was merely decorative; inside a live row it reads as an overflow menu and would open the card instead. No menu replaced it.
- Deck **actions (⋯)** and **Add card (+)** stay visibly disabled and honestly labelled. No CRUD, authoring, duplicate, move or suspend action was made functional.
- The **Insights** tab stays visibly unavailable. Only its copy was corrected: it claimed insights would arrive "once mobile data is composed", which M-DEMO-3 made untrue. It now says plainly that a per-deck breakdown is not built yet. No analytics surface was added inside Deck.

### What is deliberately NOT here

- **Card and deck CRUD, and authoring.** New Deck, Edit, Delete, New Card, Edit Card, Duplicate, Move and Suspend remain unavailable on mobile. A later milestone decides whether mobile authoring is needed for the market-validation build at all.
- **Any cloud or persistence work.** No Supabase, no `Repository`, no SQLite, no AsyncStorage, no sync. M1A is untouched, and demo state still resets on a full app restart by decision.
- **A visual redesign.** Library, Deck, card rows, Review, the six interaction Views and the tab bar are unchanged; the study route is drawn in the already-approved Review card language.

### Gates

```
apps/mobile: npx jest                       -> 30 suites, 417 tests, passing (was 29 / 356)
apps/mobile: npx tsc --noEmit               -> clean
apps/mobile: npx expo lint                  -> clean
apps/mobile: npx expo-doctor                -> 18/18
apps/mobile: npx expo export --platform ios -> bundles (4.2 MB hbc)
root:        npx vitest run                 -> 111 files / 1064 tests (unchanged)
root:        npx tsc -b --force             -> clean
root:        npm run lint                   -> clean
root:        npm run build                  -> successful, PWA precache 24 entries
```

The root remains clean after every Expo command: no root `.expo/`, no root `eslint.config.js`, and the root `tsconfig.json` is untouched (the D398 trap). No `apps/web` or `packages/core` file was modified.

Physical-device verification is **pending the owner** and is not claimed. Verify on iPhone: open a populated deck; tap several different cards and confirm each opens the correct one; study a Recall, Multiple Choice, Write Code (with the keyboard), Ordering (by touch), Matching (by touch) and Walkthrough card; confirm no Due or Review number anywhere changed; back to the correct deck; Study Now; confirm the session holds only that deck's cards; finish it; confirm the deck's Due count and Today/Progress moved; Done returns to the originating deck; Undo restores it; open a deck with nothing due and confirm the caught-up state; no red screens.

---

## 28. Market-validation readiness cleanup (milestone M-DEMO-5)

**The mobile app is now a bounded, deterministic market-demo, prepared to be recorded and put in front of prospective users.** M-DEMO-1 through M-DEMO-4 made it functional; this milestone made it *honest*. It added no product subsystem: it is a breadth pass over already-designed surfaces whose single rule was that every visible affordance must be functional, intentionally and clearly unavailable, or removed.

**Two product-scope decisions are restated here as decisions, not as debt.** **Mobile card and deck authoring is deferred** — the web app remains the intended authoring surface, and Itera's early product story is desktop authoring plus convenient mobile review. **Cloud/Supabase remains deferred** until after market validation, and demo persistence with it. None of the three belongs in `TODO.md`, and none was added there.

Physical-device verification is **pending the owner** and is not claimed.

### The rule that was applied

> No control may look enabled and do nothing.

Eleven disabled controls survived from the mockup phase, existing only because a reference image had a button in that position. For a build shown to prospective users, a permanently greyed primary action does not read as deferred scope - it reads as an unfinished product. Every one of them was **removed rather than disabled**, because none was pending work: each names a capability this platform has deliberately chosen not to have yet.

| Surface | Removed | Why not merely disabled |
|---|---|---|
| All Decks | New Deck, Import, the "all collections" grid button | Deck authoring and backup are deferred scope; the scope rail already lists every collection |
| Deck row (All Decks) | the overflow kebab | Inert in a dead row, deceptive in a live one - it reads as a menu and would open the deck |
| Collection | New Deck, Collection settings, the `⋯` overflow | Three greyed controls under the metrics card made a working screen look half-finished |
| Deck | deck actions `⋯`, Add card `+` | Deck and card CRUD are deferred scope |
| Deck | the **Insights** tab | A placeholder that said so. The metrics above the card list are the real per-deck numbers; a second per-deck analytics surface exists on neither platform. With Add card gone, the tab strip held one tab and one dead button, so the card list became the deck's body under a plain **Cards** heading |
| Progress | the `3M` / `1Y` range buttons | Progress reports one real window. Making them real is not wiring: the heat map draws one 24px cell per day (365 cells is ~36 rows) and the retention series asks for one bucket per day, and 28 days of seeded history would render both nearly empty. The date pill already names the window every figure is computed over, and `demoProgressViewModel` keeps its `preset: DateRangePreset` parameter, so a future range stays a wiring change |
| Profile (demo mode) | the seven settings rows, six "Not available yet" panels, and the Import / Export panel | Six could only say "not available yet" and the seventh offered a backup this platform cannot perform. **Cloud mode renders all of it unchanged** - the intended future structure is preserved, not destroyed |

**One control was not merely unavailable but actively misleading:** Import / Export's **Merge / Replace** radio group responded to every press and changed state while the two buttons above it could not run. It went with the panel that held it.

`src/components/PlaceholderScreen.tsx` was deleted outright - dead code with zero importers, whose copy read "This mobile section is intentionally awaiting its own design review."

### Controls that became functional or honest

- **Today's hero action.** It read *Start your next session* even at zero due, and opened the session route, which answered with a completion screen. The same single control in the same slot now reads **Browse your library** and opens Library when nothing is due - web's settled behaviour. Composition, metrics, geometry and animation are untouched. Its accessibility hint no longer says "Opens the temporary Review destination".
- **Every notification now has an honest destination.** Three rows previously only marked themselves read. `DemoNotification` gained an explicit destination union - `deck` / `collection` / `review` / `progress` - authored per notification rather than inferred from its kind, because two rows can share a kind and belong in different places. Today's session → the Review entry; the streak and retention rows → Progress; new cards → the Interview Core collection; the three deck rows → their decks. The hint names the surface it will open. The field stays optional and the mark-read-only copy is retained, because a silent dead-end row is exactly the defect this prevents.
- **Today's Continue Learning** states that nothing is in progress instead of heading an empty list.
- **The Deck screen's back control.** It read *Back to {collection}* while calling `router.back()`, which returns to whatever pushed the deck - All Decks, a collection, Today's Continue Learning, a Progress row or a notification. Four of the five entry points are not that collection. It now says **Back**, and the collection name moved into the identity block as a caption: context, not a promise about navigation.
- **The Notifications "Settings" shortcut is hidden in demo mode**, where the Profile section it opens no longer renders.

### Fixture corrections (read-only pass, one defect found)

The card prompts, deck names, collection descriptions and derived metrics all read as real product content and were left alone. **No number was massaged.** One genuine contradiction was found and fixed: *"6 new cards were added to Interview Core"* counted every card in the collection and called all of them new, while those cards were authored between 8 and 88 days before the anchor and none was added on the day the row claimed. Both the count and the date now derive from the cards actually added on the most recent addition day - it reads **"1 new card was added"**.

Correcting it exposed a second, subtler problem. Entity dates are authored against the fixed `DEMO_EPOCH` while everything the learner *did* is replayed relative to the current local day, so an absolute date label would have shown a demo recorded three months from now an inbox dated last August. `fixtureDateLabel()` reads an authored instant as the same age measured back from the workspace's own anchor, then formats it through core's one event formatter. The import row says **Yesterday** on any recording day, and a regression asserts that 400 days later.

Five of the eight demo decks remain honestly empty. That is a deliberate M-DEMO-1 decision, not a defect - but it is worth knowing before recording that the Library shows three populated decks and five empty ones.

### Prototype language

Removed from product surfaces: the completion screen's *"Demo mode. This session is held in memory and resets when the app restarts."* (after every session, on the most-recorded surface in the app), the four not-found details naming "the demo workspace", the Deck empty-state copy, the Today hero hint, and the false cloud-mode line "Product screens still use preview data".

The disclosure itself was **not** dropped. Profile's identity card still states plainly that this is a **Demo workspace**, that the data is *deterministic demo data, not a synced account*, and that *nothing here is saved between app launches*. Both `__DEV__` rows keep their explicit development language, as does the diagnostics probe.

### Accessibility and touch

A focused pass over what M-DEMO-1 to M-DEMO-4 touched, fixing concrete defects only:

- **Ordering's up/down arrows** were 38×32 with 4pt of slop. They are stacked and adjacent, so a symmetric `hitSlop` would place each one's slop inside the other's visible bounds - and the later sibling wins an overlapping hit, which would have made the bottom of the visible *up* button move the item **down**. The slop now only ever grows outward: 50×38 of touchable area with no ambiguous region. 44pt tall would require a taller row, which is approved layout rather than an accessibility defect.
- **"Mark all as read"** wrapped a bare `Text`; it now has a 44pt target.
- The Deck status chip's **dismiss** control went from a 32pt to a 44pt target.
- Both bottom sheets' dismiss backdrops announce themselves as buttons.

Rating controls (118pt tall, labelled with their real interval and any suggestion), Matching cells (92pt), the session exit, the header bell and both search inputs were audited and already correct.

### Runtime cleanliness

Six `act(...)` warnings came from Itera test code calling provider setters imperatively (`undoDemoReview`, `resetDemoWorkspace`, `markAllNotificationsRead`) outside `act`, and are fixed. The remaining 108 are one external cause: `@expo/vector-icons` loads its font asynchronously and calls `setState` after the synchronous render a test awaited. Production code was not contorted to silence it.

### Demo reset

`resetDemoWorkspace()` rebuilds from `workspace.startedAt` and rewinds `now` to that anchor. That is verified rather than changed, and it is the property repeated recordings need: every reset within one app run reproduces byte-identical state. A regression drives a **whole** deck-scoped session to completion, marks the inbox read, asserts that scheduling, history, notifications and every derived screen moved, then resets and asserts the workspace deep-equals a fresh `createDemoWorkspace(startedAt)` - together with the Today, Progress, Library and Deck view models built from it. It remains `__DEV__`-only, refused again inside the helper, and is never offered as a learner control.

### Tests

Mobile coverage is **32 suites / 436 tests** (was 30 / 417). The new and rewritten assertions are about this milestone's actual changes: that no `unavailable` control renders on All Decks, Collection or Deck and that those screens carry **no** disabled control at all; that the Insights tab is gone and a Cards heading took its place; that Progress renders no range buttons but still names its range; that demo-mode Profile renders no settings row, no backup panel and no radio group while cloud mode still renders all seven sections, its backup panel and Sign out; that each of the seven notifications navigates to its own mapped destination and names it in the hint; that Today's CTA switches label and destination at zero due and says so when nothing is in progress; that the deck back control promises nothing it cannot reach; that the notification copy counts only what was actually added and stays fresh 400 days later; and the full reset-determinism regression. No shared domain algorithm is re-tested.

### What is deliberately NOT here

- **Mobile authoring.** New Deck, Add Card, Edit, Delete, Duplicate, Move, and the Matching and Walkthrough editors remain absent. This is current product scope, not a technical TODO.
- **Any cloud or persistence work.** No Supabase, no `Repository`, no OTP, no SQLite, no AsyncStorage, no sync. M1A is untouched.
- **Import / Export**, push notifications, Review History, Roadmaps, onboarding and dark mode.
- **A redesign.** No new visual system, no new section, no change to the Today hero composition or the tab architecture, no Progress redesign. What changed is removals, the spacing that closed behind them, copy, touch targets and one control's destination.

### Gates

```
apps/mobile: npx jest                       -> 32 suites, 436 tests, passing (was 30 / 417)
apps/mobile: npx tsc --noEmit               -> clean
apps/mobile: npx expo lint                  -> clean
apps/mobile: npx expo-doctor                -> 18/18
apps/mobile: npx expo export --platform ios -> bundles (4.2 MB hbc)
root:        npx vitest run                 -> 111 files / 1064 tests (unchanged)
root:        npx tsc -b --force             -> clean
root:        npm run lint                   -> clean
root:        npm run build                  -> successful, PWA precache 24 entries
```

The root remains clean after every Expo command: no root `.expo/`, no root `eslint.config.js`, and the root `tsconfig.json` is untouched (the D398 trap). No `apps/web` or `packages/core` file was modified.

Physical-device verification is **pending the owner** and is not claimed. Verify on iPhone: that Today opens looking intentional and every visible action works; that Library search, filter, sort, collections, decks, card study, Study Now and the caught-up and empty states behave; that all six interaction types, the Write Code keyboard, Ordering and Matching by touch, Walkthrough, completion and Undo work; that Progress metrics, heat map, retention chart and deck navigation work and that no range control is missing anything; that Profile shows no misleading account or cloud action and `__DEV__` Reset Demo restores the opening state; that every notification opens its stated destination; that back, swipe-back and tab visibility are coherent with no dead ends; and that no screen shows an enabled-looking no-op control or internal terminology.

---

## 29. Expo Go crypto startup hotfix

The first physical-device run after M-DEMO-5 exposed a startup crash that Jest,
TypeScript and the earlier bundle gate could not detect: Expo Go's React Native
runtime had no `globalThis.crypto`. `DemoWorkspaceProvider` constructs seeded
history during its initial state creation, `buildReviewLog()` calls core's
`newId()`, and `newId()` tried to read `randomUUID` from that absent object.

Core remains platform-neutral and still consumes only the structural Web Crypto
shape. Mobile now owns the platform bridge: `apps/mobile/index.ts` is a custom
Expo Router entry, installs `expo-crypto` first, and imports
`expo-router/entry` last. Existing browser crypto is preserved; an insecure web
origin that has `getRandomValues` but not `randomUUID` still uses core's existing
UUID v4 fallback.

Verification after the fix:

```
apps/mobile: npx jest                       -> 33 suites, 439 tests, passing
apps/mobile: npx tsc --noEmit               -> clean
apps/mobile: npx expo lint                  -> clean
apps/mobile: npx expo-doctor                -> 18/18
apps/mobile: npx expo export --platform ios -> bundles from index.ts (4.21 MB hbc)
root:        npx vitest run                 -> 111 files / 1064 tests
root:        npx tsc -b --force             -> clean
root:        npm run lint                   -> clean
```

The focused regression begins with no global crypto, installs the mobile bridge,
and successfully calls the same shared `newId()` reached by demo history. A
fresh Expo Go run with Metro's cache cleared remains the final device check.

---

## 30. Mobile notification read-state refinement

Read notification rows no longer combine a medium gray card with a 38% gray
overlay. They use the existing `navySoft` neutral surface, standard border,
muted copy and a restrained shadow, keeping them visibly read without washing
out the content or category mark.

The row now has two explicit touch paths:

- the main content opens the notification's destination and, when needed,
  marks it read;
- the trailing Read/Unread badge is a separate 44-point button that toggles the
  state without opening the destination.

The state still lives only in `DemoWorkspaceProvider`, so the badge, All/Unread
filter, Mark all as read action and header unread dot react to the same value.
The new reverse operation is `markNotificationUnread`; no screen-local state or
notification backend was added.

Verification: 33 mobile suites / 442 tests, 111 root files / 1064 tests, both
typechecks, both lints and the 4.21 MB iOS/Hermes export are clean. Chromium at
390x844 changed a read item to unread without leaving `/notifications`, with no
console or page errors. Physical-device touch and appearance review remains
pending and is not claimed.

---

## 31. Canonical Demo Repository convergence (milestone M-PARITY-1A)

**The mobile Demo runtime now uses the same canonical Repository-backed Deck/Card/ReviewLog architecture as the rest of Itera.** This is an architectural convergence milestone and it added no learner-visible capability by intent: the app is meant to look and behave as M-DEMO-5 left it, with the entity data path replaced underneath. The decisions are D421-D426 (2026-08-27).

### What changed

- **Collections are canonical.** The demo's parallel `DemoCollection[]` plus `DemoDeck.collectionId` is deleted. The four collections are ordinary `Deck` rows with children, hierarchy is `Deck.parentId`, and every collection surface derives through core's `deriveCollections` / `leafDecks` / `collectionIdFor`. The seed is twelve decks (4 collections + 8 browsable) rather than eight; the rail, All Decks, Unfiled, child lists and the deck caption all reproduce exactly. `DEMO_SCOPE_RAIL` became `DEMO_COLLECTION_RAIL` and now carries **presentation order only**, appending any collection the deck tree has that it was not authored with.
- **`apps/mobile/src/data/InMemoryRepository.ts`** implements the whole `Repository` contract in memory, including drafts and roadmaps, which mobile has no UI for. Filtering, ordering and suspension follow `DexieRepository`; both guarantees are honestly `transactional`. One recorded divergence: `commitReview` is idempotent on the log id rather than throwing on a duplicate, preserving demo duplicate-grade protection on a platform with no persist-failure surface.
- **`apps/mobile/src/demo/demoRuntime.ts`** composes it and registers it with `configureRepository()`, and owns the run anchor so reset rebuilds from the same instant (D417's determinism).
- **`DemoWorkspaceProvider` no longer holds entities.** It keeps the demo clock, the notification inbox (the one demo concept with no Repository store) and reset orchestration. `applyDemoReview` / `undoDemoReview` are gone.
- **Screens read through the shared hooks.** `useDemoEntities()` wraps `useDecks` / `useSearchCards` / `useReviewLogs`; `useDemoScreen()` adds the clock. Re-render comes from the invalidations the core mutation hooks already perform. The selectors stayed pure and only changed the value they take.
- **Review writes go through the seam.** `DemoReviewSession` calls `usePersistReviewResult` and `useUndoGrade`, so a graded card and its ReviewLog commit together and Undo is the exact inverse; the grade is awaited before the queue advances.
- **Reset coordinates three layers**: reseed the repository from the anchor, `queryClient.clear()`, restore inbox and clock. The middle step is load-bearing - without it screens keep rendering pre-reset entities from cache. Reset discards anything authored during the run.
- **Demo-mode query tuning** is `staleTime: 0` / `retry: false` / no focus refetch; cloud mode's values are unchanged.
- **`validateRecallForm`** now exists in `packages/core/src/domain/cards/recallForm.ts` and web consumes it. Behaviour-preserving; the only web change in this milestone.

### What did not change

- **No authoring UI.** New Deck, Rename, Delete, Add Card, the type chooser and every editor remain absent - they are M-PARITY-1B. The tests that assert their absence still pass.
- **Cloud mode.** `SupabaseRepository`, OTP, SecureStore, `Stack.Protected` and the composition root's cloud branch are as M1A left them. No credentials are required and there is no silent fallback from a broken cloud configuration to demo.
- **Persistence.** Still no AsyncStorage, no SQLite, no network. Demo state lives for the life of the process and resets on a full app restart.
- **Design.** No new visual system, no layout change, no change to the Today hero composition or the tab architecture.

### One recorded behavioural consequence

A collection id and a deck id now come from one id space, so `/library/deck/<collectionId>` resolves to a real deck. It **redirects** to that collection's screen, the call web's `LibraryDeckPage` already makes, rather than rendering an accurate but useless empty deck page. No navigation in the app produces that link; it is reachable by hand and by a future authored hierarchy.

### Tests

36 mobile suites / 503 tests (was 33 / 443). New: `InMemoryRepository.test.ts` (32 cases - seeded reads, deck and card writes, non-cascading deletes, search, due query and its id tie-break, commit/revert and commit idempotence, whole-workspace writes, the review store, `resetTo`); `demoHierarchy.test.ts` (17 - no `collectionId` anywhere, derivation agrees with core by value, and a deck authored later with `parentId` entering the right collection, promoting a childless leaf to a collection, and being covered by a deck-scoped session through `subtreeIds`); `demoRuntime.test.tsx` (11 - demo registers the in-memory backend and never constructs a Supabase client, seed determinism, and shared-hook mutations re-rendering consumers with reset clearing the query cache). `demoReviewSession.test.tsx` now asserts the repository's contents directly as well as what the hooks see.

### Gates

```
apps/mobile: npx jest              -> 36 suites, 503 tests, passing
apps/mobile: npx tsc --noEmit      -> clean
apps/mobile: npx expo lint         -> clean
apps/mobile: npx expo-doctor       -> 18/18
apps/mobile: npx expo export --platform ios -> 4.23 MB Hermes bundle
root:        npx vitest run        -> 111 files, 1070 tests, passing
root:        npx tsc -b --force    -> clean
root:        npm run lint          -> clean
root:        npm run build         -> clean
```

Root hygiene re-checked: no root `.expo/`, no root `eslint.config.js`, `tsconfig.json` unchanged.

**Physical-device verification is pending the owner and is not claimed.** The check is a regression pass rather than a feature pass: demo opens, Today/Library/collections/Deck/Card look unchanged, Review works and completing it moves Today and Progress, Undo works, Reset Demo restores everything, and no red screen appears.

---

## 32. Mobile Deck CRUD and Recall/Multiple Choice authoring (milestone M-PARITY-1B)

**Mobile authoring parity is now underway.** The create-material journey that physical-device testing found missing - Library, New Deck, Deck, Add Card, author, save, edit, delete - works end to end in Demo mode. The decisions are D427-D437 (2026-08-27).

### What works

- **New Deck** on All Decks (top level) and inside a Collection (`parentId` = that collection's id, and nothing else - there is still no `collectionId` and no Collection entity). The form is name plus optional description, gated by core's new `validateDeckForm`. After a successful create the form replaces itself with the new deck's screen (D433).
- **Edit deck** and **Delete deck** from a real actions control in the deck identity row. Delete goes through core's new `checkDeckDeletion`: a deck with its own cards or with child decks is refused with a message naming what is in the way, and an empty one gets a destructive confirmation that names the deck in words. A successful delete leaves the route.
- **Add Card** opens a type chooser listing **Recall and Multiple Choice only** - not four disabled rows (D431).
- **Recall** and **Multiple Choice** create and edit, bound to the shared form models, validators and `saveXCard` paths. **No native save logic exists**: no id, no `RichContent` wrapping, no timestamps, no scheduling seed is constructed on this platform.
- **Card edit and delete** from a per-row actions control. The row tap still opens Card study; Edit is listed only for a type that has an editor.
- Authored cards are canonical `Card`s: they appear in the deck list, in search and the status filter, in deck and Today/Progress counts, they open in Card study through the existing registry, and they enter the Review queue when due. Nothing special-cases them.

### Shared core changes (the whole production change outside mobile)

- `packages/core/src/domain/decks/deckForm.ts` - `DeckFormState`, `emptyDeckForm`, `validateDeckForm`, in the `{canSave, errors}` shape the six card validators use.
- `packages/core/src/domain/decks/deletion.ts` - `checkDeckDeletion({directCardCount, childDeckCount})` and `childDeckCount(decks, id)`.
- Web calls both. `LibraryBrowserPage`, `LibraryCollectionView` and `DeckSettings` are the only web files touched, and **web's rendered behaviour is unchanged** - each delete call site keeps its own wording, and `DeckSettings` gates Save on the extracted validator instead of an inline `name.trim()`.

### Mobile additions

- `src/components/ui/` - the first shared primitive layer on this platform: `IteraButton`, `FormField`, `FormTextInput`, `ActionSheet`, `ConfirmSheet`, `EditorScreen`. Six files, each used by at least two surfaces, no dependency added, no existing screen restyled (D434).
- `src/components/cards/` - `DeckFormScreen`, `RecallEditorScreen`, `MultipleChoiceEditorScreen`, `McOptionRow`, `CardContentFields`, and `authoringTypes.ts` (the one list of authorable types, consulted by both the chooser and the row's Edit action).
- Four routes at the `(app)` level, so each is a pushed detail surface with the native transition and back-swipe and no tab bar: `deck/new`, `deck/[deckId]/edit`, `deck/[deckId]/card-new`, `card/[cardId]/edit`. Each resolves its parameter by lookup and shows an honest not-found state otherwise.
- `MobileDeckViewModel` gained `childDeckCount`, because the deletion guard needs it and the screen must not compute the rule itself.

### What did not change

- **No persistence.** Authored decks and cards live in the `InMemoryRepository` for the life of the process. Reset Demo discards them through the existing three-layer reset with no new code (D436). No AsyncStorage, no SQLite, no network, and no "unsaved work" warning.
- **No cloud.** Supabase, OTP, SecureStore and the composition root's cloud branch are untouched. Cloud remains deferred until after market validation.
- **The remaining four editors.** Write Code, Ordering, Matching and Walkthrough have no authoring UI, and no control offers one. Cards of those types study and review normally.
- **Move, Duplicate, Suspend, drag reorder, Collection management and Import/Export.** None was started, and none has a placeholder control.
- **An in-editor live preview.** Web's editors carry one; the native editors do not. A newly saved card can be inspected immediately through Card study, and a preview pane inside a 390-point form is a design question this milestone did not open.
- **Design.** No new visual system and no layout change to an existing screen.

### Tests

39 mobile suites / 545 tests (was 36 / 503). Three new suites, all driving the real composed demo runtime through `renderInDemo`'s provider and asserting against the repository's actual contents:

- **`deckAuthoring.test.tsx` (9)** - blank-name refusal and Save gating, a canonical top-level create, a create inside a collection with derived membership and no `collectionId`, leaf-to-Collection promotion, edit preserving id/createdAt/parent, both refusal cases of the shared guard, a confirmed delete leaving the route, and Reset discarding an authored deck.
- **`recallAuthoring.test.tsx` (12)** - Save gated on the shared validator case by case, a canonical Card written through the shared save path (including the form model's tag parsing and de-duplication), canonical New scheduling, **byte-for-byte preservation** of a prompt and answer carrying backticks, `<T>`, `snake_case`, braces and markdown-like punctuation, the card appearing through hook invalidation with no restart, the card opening in Card study through the existing registry, an edit loading every field, an edit preserving id/createdAt/deckId/suspended/order **and the entire `SchedulingState`** with its ReviewLogs still attached, delete from the row actions sheet leaving history orphaned as the product allows, and Reset.
- **`multipleChoiceAuthoring.test.tsx` (15)** - each shared validation rule surfacing, the two-option floor with Remove disabled rather than hidden, add/remove preserving the right option, single-select exclusivity and the multiple-to-single trim, the accessible names on every option control, a canonical option payload with stable ids, byte-for-byte option text, Card study, an edit loading prompt/mode/options, an edit preserving identity and scheduling, adding an option to an existing card without minting a new one, delete, and Reset.

The deck screen suite additionally gained the chooser's contents, the conditional Edit affordance, the unambiguous row tap, and the delete refusal. Web gained two regressions on the extracted deletion guard; core gained `deletion.test.ts` and `deckForm.test.ts`.

No shared validation rule is restated here - those are unit-tested in core. These prove the native binding: that the screens call them, that the writes reach the configured Repository through the shared hooks, and that what lands there is a canonical Card.

### Gates

```
apps/mobile: npx jest              -> 39 suites, 545 tests, passing
apps/mobile: npx tsc --noEmit      -> clean
apps/mobile: npx expo lint         -> clean
root:        npx vitest run        -> 113 files, 1082 tests, passing
root:        npx tsc -b --force    -> clean
root:        npm run lint          -> clean
root:        npm run build         -> clean (precache still 24 entries)
```

Root hygiene re-checked: no root `.expo/`, no root `eslint.config.js`, `tsconfig.json` unchanged. `npx expo-doctor` and the iOS export were not re-run in this pass.

**Physical-device verification is pending the owner and is not claimed.**

---
