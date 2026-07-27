# Itera — Redesign Implementation Plan

Phased per `itera_claude_master_spec.md` §34, grounded in this repository's actual files. **Revised** from the original version after a correction pass — see `itera-decisions.md` for what changed and why. Each phase lists concrete files/modules touched, explicit dependencies (no phase depends on a phase that doesn't exist or hasn't been reached), and acceptance criteria.

Status legend: not started unless noted. As of this revision: Phase A complete. **The first Phase B/C pull request is complete and merged into the working tree** — see the updated status blocks below and `itera-decisions.md` (2026-07-23 entries D20-D24) for the amendments applied during implementation. No other phase has started; no existing production file's behavior was changed (one production file, `src/app/theme.tsx`, gained a purely-additive export — see D22).

**Data migrations are their own phases (D and G below), not steps hidden inside a UI phase.** This was a defect in the previous version of this document — it said Phase F (Library UI) "depends on Phase G," but Phase G was Today, not a migration phase. Fixed by giving the Card taxonomy migration, the CardState extraction, and the Collection/Deck split each their own explicit phase, in that order, before any UI phase that depends on them.

## Phase A — Repository audit (complete)

**Deliverables:** `itera-repository-audit.md`, this document, `itera-decisions.md`, `itera-migration-plan.md`.
**Depends on:** nothing.
**Status:** complete. The two blockers raised here (Roadmaps, rebrand scope) are now confirmed — see `itera-decisions.md` D17/D18 (2026-07-23). They did not block Phase B/C either way, since those phases are additive.

## Phase B — Design tokens + preview infrastructure (narrowed; first slice shipped)

**Goal:** make the new visual language renderable, proven on exactly one real, working screen — not sketch ten screens shallowly.

**Shipped:**
- Itera design tokens in `src/index.css`, fully namespaced: a `.itera-scope` class (not a `[data-theme]` value — kept independent of the app's existing light/dark toggle) defining every `--itera-*` token plus a scoped re-point of the legacy semantic var names (`--bg`, `--accent`, `--code-bg`, ...) so reused components render on-brand with zero edits to them. Additive lines in the existing `@theme inline` block expose `itera-`-prefixed Tailwind utilities. Nothing existing was removed or reassigned.
- A namespaced flip mechanism, `.itera-flip*` — see the FlipCard note below.
- Preview-route infrastructure: `design-preview` registered as a **structurally separate top-level route** in `router.tsx` (a sibling of `/`'s `AppShell` route, not nested under it), so it is chrome-free by construction, not by hiding production chrome with CSS.
- Fixtures: `src/features/design-preview/fixtures.ts` — a representative `CardV2` Recall card with real Markdown and a fenced ` ```cpp ` block.
- **The one real vertical slice:** `/design-preview/review/recall`, fully working — literal front/back flip, Tip before reveal, Explanation + four-button rating after reveal, keyboard support (Space to flip, 1-4 to rate, guarded against key-repeat and against firing while focus is on another control), reduced-motion respected. Built from real, reusable components: `FlashcardSurface`, `TipPanel`, `ExplanationPanel`, `RatingControls` (`src/features/reviewV2/components/`), plus a new accessible `FlipCard` (see below) and `RichText`/`LazyCodeView` reused unmodified from production.

**Two things found and fixed during this slice, not deferred (see `itera-decisions.md` D21/D22):**
- Production's `src/components/ui/FlipCard.tsx` fails keyboard activation and accessible semantics (plain `<div onClick>`, no `tabIndex`/`role`/key handler). Rather than edit the file `ReviewSession.tsx` also imports, a small separate primitive was built: `src/features/reviewV2/components/FlipCard.tsx`, reusing the verified-sound CSS mechanism under new `.itera-flip*` names, adding real button semantics. Zero footprint on any production file. Worth revisiting in Phase E: fix the shared primitive too (benefiting production), or keep them separate permanently.
- `CodeView` picks its syntax-highlight palette from live `ThemeContext`, not a CSS var — under the app's dark-by-default configuration this produced a real dark-palette-on-light-card mismatch, not an edge case. Fixed at the root: `ThemeContext` is now exported from `src/app/theme.tsx` (one-line, additive), and `src/features/design-preview/ForceLightTheme.tsx` locally overrides it to `'light'` for the preview subtree only, touching neither `document.documentElement` nor `localStorage`.

**Explicitly out of scope for Phase B** (unchanged from the correction pass):
- `/design-preview/today`, `/library`, `/deck`, `/create/recall`, and the other five `/design-preview/review/*` routes. Each is added **only once its real, reusable components exist** — Today's route arrives with Phase I's components, Library's with Phase H's, each remaining review interaction's with Phase E's, Create's with Phase F's.

**Depends on:** nothing blocking — additive, and did not require the two Phase A questions to be resolved.
**Acceptance:** met. `/design-preview/review/recall` is reachable (verified: HTTP 200 against the dev server for both this route and `/`), uses only new tokens, is fully operable by mouse and keyboard, and renders real fixture data through real components. Typecheck, lint, the full test suite (92/92), and a production build all pass. **Not verified in this pass:** actual rendered appearance at desktop/mobile widths — no browser/screenshot tool is available in this environment; verification beyond HTTP reachability needs a human (or a future session with browser tooling) to actually load the page.

## Phase C — Shared Card v2 types + Card-payload migration (first slice shipped)

**Goal:** introduce the 6-interaction-type model as new types, and a pure function that adapts old Card content into it. This is the **one place** lazy-on-read migration is appropriate — see the migration-strategy note below.

**Shipped:**
- `src/types/cardV2.ts` — `RichContent`, `CardInteraction` union (6 types), `CardV2`, `CardState`, `ReviewEvent`, `StudySession`.
- `src/domain/migration/cardMigration.ts` — `migrateCard(card: Card): CardV2`, one pure function per old type.
- `src/domain/migration/cardMigration.test.ts` — one test per old type, id/tag/timestamp preservation, the multi-range/fixed-column/triple-matching cases, and now an explicit **idempotence** test (`migrateCard` called twice on the same input is deep-equal). 12 tests passing.

**Still needed in Phase C** (unchanged — not part of this PR):
- A test that a real exported v1 backup migrates every card without throwing.
- `parseBackup()` behavior once `BACKUP_VERSION` becomes `2`: a v1 backup must auto-migrate on import, not be rejected; the existing "reject newer" guard needs a test confirming it still holds once v2 exists.

**Migration strategy for this phase, and only this phase:** lazy-on-read is acceptable here, and only here. `migrateCard` runs on old Card content read from storage; nothing is a forced one-shot rewrite. This does not apply to CardState extraction or the Collection/Deck split (Phases D and G) — see `itera-migration-plan.md` §0 for the shared explicit-migration contract those require.

**Depends on:** nothing blocking (additive types + a pure function).
**Acceptance:** met. Every v1 card type migrates through `migrateCard` without throwing; the registry's exhaustive switch in `src/features/cards/registry/index.ts` is untouched; 12 tests pass; typecheck/lint/build all pass.

## Phase D — CardState extraction and rollout (steps 1–3 of 6 shipped)

**Status (2026-07-23):** steps 1–3 shipped — additive Dexie (`version(3)`, `cardStates` store) and Supabase (`supabase/migrations/0001_card_states.sql`, `schema.sql`) schema; a tested `MigrationRunner` backfill (`src/domain/migration/cardStateBackfill.ts`); dual-write wired into every write path (`useGradeCard`, `useUndoGrade`, `usePersistReviewResult`, `useCreateCard`, `useSaveCard`, `useDeleteCard`). Reads are **not** cut over — `Card.scheduling` stays the sole source of truth. A "Card scheduling migration" section in `SettingsPage.tsx` lets the product owner actually run the dry-run/apply cycle against their real local data (data is client-side IndexedDB, so this is the only way to do it). Not yet run against real data as of this writing. The Supabase side is implemented but unverified against a live database (no project currently exists — see `itera-decisions.md` D37/D42). See D38-D44 for the material decisions.

**Goal:** separate scheduling state from card content (spec §7.6) as a real, explicit, reportable, reversible migration — not a side effect of the Review rewrite. This phase can run **in parallel with** Phase E; see the dependency note at the end of Phase E for exactly how they meet.

**Steps, each a discrete, reviewable unit of work:**

1. **Additive schema.** A versioned Supabase migration file (`supabase/migrations/0001_card_states.sql` — see the Supabase-process correction in `itera-migration-plan.md` §8) adding a `card_states` table (RLS + grant, same pattern as every other table) and a Dexie `version()` bump adding a `cardStates` store. `Card.scheduling` is untouched at this point — purely additive.
2. **Backfill.** A run-once, reportable migration (conforming to the runner contract in `itera-migration-plan.md` §0) that writes one `CardState` row per existing `Card`, copied from `card.scheduling`. Dry-run first; reports before/after counts and any card with no scheduling data (should be none, but the report proves it rather than assuming it).
3. **Dual-write.** `useGradeCard`/`useUndoGrade` (`src/hooks/useReview.ts`) and `createCard` (`src/domain/cards/factory.ts`) are changed to write to **both** `Card.scheduling` (existing, unchanged) and the new `CardState` row, behind the `ReviewService` boundary introduced in Phase E. Reads still come from `Card.scheduling` — nothing observable changes yet.
4. **Parity verification.** A script/test comparing every `Card.scheduling` against its corresponding `CardState` row in a real (or realistic staging) dataset, over a real period of use, confirming they never diverge under dual-write.
5. **Read cutover.** Once parity is proven, `getDue()` (both backends) and every other read of `card.scheduling` switch to reading `CardState`. `Card.scheduling` is still written (harmless) but no longer read. This is the point at which the `ReviewService`'s internal implementation actually changes — its public interface, and therefore Phase E's Review UI, does not change at all.
6. **Rollback path.** At every step 1–5, rollback is: stop reading `CardState` (step 5 is reversible by reverting the read, since dual-write in step 3 kept `Card.scheduling` current); the `card_states` table/store can be dropped without any data loss as long as step 5 hasn't shipped, since it's additive. Documented per-step in the Supabase migration file's rollback notes.
7. **Cleanup (deferred to Phase M):** only in a later cleanup release, once read cutover has been live and stable for a real observation period, does `scheduling` get removed from `Card` and dual-write stop. Not part of this phase.

**Testing requirements (see full list in `itera-migration-plan.md` §9):** scheduling state preserved exactly through backfill; due queries return the identical set of cards before and after cutover on the same dataset; Review undo remains correct under dual-write; golden/invariant FSRS tests exist (multi-review sequences, known reference values) before this phase treats `scheduler.ts` as a fully verified boundary — the current `scheduler.test.ts` gives basic behavioral coverage only (see the audit's revised FSRS section).

**Depends on:** nothing from Phase B/C is required to *start* schema/backfill work (steps 1–2); the `ReviewService` boundary needed for dual-write (step 3) is introduced by Phase E, so steps 3–5 depend on Phase E having landed at least that boundary.
**Acceptance:** the runner contract's dry-run/apply/report cycle works and has been exercised against a real backup-derived dataset; parity holds for a defined observation window; read cutover ships with a working rollback path; no card's scheduling state changes value at any step (only its storage location does).

## Phase E — Review foundation (all 6 interactions built and production-integrated)

**Status (2026-07-23):** shell built and shipped — `ReviewSessionScreen`, `reviewPhaseReducer`, `ReviewTopBar`, `reviewService.ts`, the `InteractionDefinition` registry (`src/features/reviewV2/`). All six interaction types (Recall, Multiple Choice, Write Code, Ordering, Matching, Walkthrough) are real, registered interactions, each with a `/design-preview/review/*` route. **The live `/review` route now renders through this shell too** (`ReviewSessionV2`, `src/features/review/`): every due v1 `Card` is migrated on read and graded through the same components the design previews use, persisting back to `Card.scheduling`. v1's `ReviewSession`/`useReviewSession` remain in the tree, unreferenced. See `itera-decisions.md` D25-D37 for the material decisions from this milestone and the PR reports for full file lists.

**Goal:** replace the Review shell and the six interaction renderers, reusing `useReviewSession.ts`'s state machine (sound, keep) but rebuilding the presentation layer around an explicit phase reducer (spec §30.3), and introducing the `ReviewService` boundary spec §9.5 requires.

**Sequence and files:**
1. `ReviewTopBar` (new) — replaces the header portion of current `ReviewSession.tsx`; exit + progress + shortcut hint only, no logo, no nav.
2. Review phase reducer (new, `src/features/review/reviewPhase.ts`) — `presenting | submitting | feedback | rating | transitioning`, replacing the current `revealed` boolean + ad hoc `autoResult` logic.
3. `FlashcardSurface`, `TipPanel`, `ExplanationPanel`, `RatingControls` — the components Phase B's Recall slice already built; reused here, not rebuilt.
4. `ReviewService` boundary (new, `src/domain/scheduling/reviewService.ts`) wrapping `reviewState`/`buildReviewLog` so `useReview.ts` calls a service, not the scheduler functions directly (spec §9.5). **Its internal implementation initially still reads/writes `Card.scheduling`** — the existing, working path — so Phase E does not need to wait for any part of Phase D to ship. Phase D later swaps this service's internals to read/write `CardState` once its dual-write and parity work is complete; the service's public interface, and everything above it (all of Review UI), does not change when that swap happens. This is the well-defined seam between Phase D and Phase E.
5. Six interaction renderers, in this order: Recall (already built in Phase B — reused, not rebuilt), Multiple Choice (from `mcq`), Write Code (from `codeCompletion`), Ordering, Matching (preserving 3-part/fixed-column capability per the locked decision in `itera-decisions.md`), Walkthrough (from `story`; reuses `LazyCodeView`'s `highlightLines`, preserving multi-range highlighting per the same locked decision). **Status: all six done.** Ordering and Matching turned out to be new v2-schema implementations, not restyles of the v1 renderers (different grading model for Matching per D31; a deliberately different keyboard mechanism for Ordering per D29) — see `itera-decisions.md` D29-D34 for why, and confirmation that the accessibility acceptance criteria below are met.

**Depends on:** Phase C (types), Phase B (tokens + the Recall components it already built). Does **not** depend on Phase D completing — see point 4 above.
**Acceptance — general:** a full review session for each of the six types is completable end to end by mouse, with `prefers-reduced-motion` respected, and zero navigation chrome visible inside the session per spec §15.1.
**Acceptance — accessibility, per interaction (replaces the previous generic "Space/Enter/1-4/Escape" line, which said nothing about the two interactions that actually need more):**
- **All interactions:** Space flips/reveals where applicable, Enter submits, 1–4 rate after feedback, Escape exits with confirmation — none of these fire while focus is inside a text/code input.
- **Multiple Choice / Walkthrough's choice steps:** options are reachable and selectable via Tab + Enter/Space, not mouse-only; selection state is exposed to assistive tech (not color-only, per spec §28.1).
- **Ordering:** every row exposes an accessible "move up"/"move down" control operable via Enter/Space (spec §28.3), and focus follows the moved item. Drag-and-drop must not be the only way to reorder. **Before styling this, verify whether `@dnd-kit`'s `KeyboardSensor` is currently enabled in this codebase's ordering implementation — the audit flagged this as unverified, not confirmed working.** If it isn't enabled, enabling it (or adding explicit move buttons) is part of this phase's acceptance, not a follow-up.
- **Matching:** provide a keyboard-operable fallback per spec §28.4 — select a source item (Tab+Enter/Space), then select a target to pair them; pairing state is announced, not conveyed by position/color alone.
- **Write Code:** the editable region is reachable and operable via keyboard alone (this should already hold for a text input, but verify against the actual `CodeEditor`/CodeMirror keymap rather than assuming it).

## Phase F — Create/Edit

**Status (2026-07-27):** all six interaction types now have editors — Recall, Multiple Choice, Write Code, Ordering, Matching, and Walkthrough: `CardTypeChooser` (all six tiles enabled, none "Coming soon" anymore), an editor shell per type (`RecallEditorShell`, `MultipleChoiceEditorShell`, `WriteCodeEditorShell`, `OrderingEditorShell`, `MatchingEditorShell`, `WalkthroughEditorShell`) each pairing an editor pane with the actual `ReviewSessionScreen`/interaction component as the live preview (desktop split / mobile tabs), and a compact `CardRowV2` in `DeckDetailPage` whose body opens the matching study preview directly, with an inline Edit button and overflow menu (Duplicate/Move/Suspend/Delete) on the row itself. A separate read-only `CardDetailPage` (`/cards/:id`) was built first, then removed after hands-on use showed it was just an extra click in front of what Study/Edit/overflow already cover one level up — see `itera-decisions.md`. Phase F's Create/Edit scope is now complete for all six types.
**A real architectural decision was made ahead of this phase's original file list:** rather than the v1 `CardEditorPage` being reworked in place to write v1 `Card` objects, `CardV2` became genuinely persisted storage — a new `cardsV2` repository member/Dexie table/Supabase table, with its own embedded `scheduling` (mirroring how v1 `CardBase` embeds it), deliberately independent of Phase D's `CardState` extraction (no reads added there, no existing card's scheduling source changed). Legacy v1 `basic`/`codeReading`/`bugFinding` cards migrate to a `CardV2Record` (via the Recall editor) and legacy v1 `mcq` cards migrate to one (via the Multiple Choice editor) the moment they're edited and saved through the new editors — same id, so `ReviewLog` history survives — and the superseded v1 row is deleted. See `itera-decisions.md` for the full reasoning and the open question this leaves.
**Known gap, not yet closed:** `CardV2Record`s are not part of the global due queue (`useDueCards`/`ReviewPage` still only reads v1 `cards`) — "Study this Card" and each editor's live preview are all deliberately non-committing, so a `CardV2Record` can be authored and previewed but not yet actually, schedulingly reviewed. Closing this (merging `CardV2Record`s into the due queue, real grading) is unscoped future work.
**Multiple Choice's editor (2026-07-26) reused Recall's pattern almost exactly** (`domain/cardsV2/multipleChoiceForm.ts`/`saveMultipleChoiceCard.ts`, `features/cardsV2/{MultipleChoiceFields,MultipleChoiceOptionRow,MultipleChoiceLivePreview,MultipleChoiceEditorShell}.tsx`) rather than an extracted shared shell — see `itera-decisions.md` D71 for why, and for the two small Review-layer keyboard/color-contrast fixes that milestone also made (shared shell + `MultipleChoiceView`, not Recall).

**Write Code's editor (2026-07-26) is a third parallel shell** (`domain/cardsV2/writeCodeForm.ts`/`saveWriteCodeCard.ts`, `features/cardsV2/{WriteCodeFields,WriteCodeAnswerRow,WriteCodeLivePreview,WriteCodeEditorShell}.tsx`), same reasoning as Multiple Choice's — see `itera-decisions.md` D72–D74. The Review-time half (type, grading, registry entry, `WriteCodeView`, the v1 `codeCompletion` migrator, and D27's no-partial-read-only-region decision) already existed from Phase E and needed no changes; only authoring was missing. `WriteCodeInteraction.editableRegion?` remains unconsumed by design — the editor documents the current whole-block-editable limitation inline rather than exposing a control that wouldn't do anything (D73).

**Ordering's editor (2026-07-26) is a fourth parallel shell** (`domain/cardsV2/orderingForm.ts`/`saveOrderingCard.ts`, `features/cardsV2/{OrderingFields,OrderingItemRow,OrderingLivePreview,OrderingEditorShell}.tsx`), same reasoning as Multiple Choice's/Write Code's — see `itera-decisions.md` D75. As with the other two, the entire Review-time half (type, grading, registry entry, `OrderingView`/`OrderingRow`, the v1 `ordering` migrator) already existed from Phase E; only authoring was missing. The list's own order **is** the correct order (no separate "mark correct" control, unlike Multiple Choice), so `correctOrder` is always derived from item order at save/preview time. This pass also closed one small, genuine accessibility gap in the already-shipped `OrderingView`/`OrderingRow`: moving an item now announces its new position via an `aria-live="polite"` region, since the visible index number and button `aria-label` changes alone aren't a reliable screen-reader signal — see D75.

**Matching's editor (2026-07-27) is a fifth parallel shell** (`domain/cardsV2/matchingForm.ts`/`saveMatchingCard.ts`, `features/cardsV2/{MatchingOptionRow,MatchingColumnEditor,MatchingRow,MatchingFields,MatchingLivePreview,MatchingEditorShell}.tsx`), same reasoning as the previous three — see `itera-decisions.md` D76. Unlike those three, not just the Review-time half but the entire richer N-column/3-part/fixed-option data model, grading, and `MatchingView` already existed from Phase E; only authoring was missing. The form generalizes a variable number of "other" columns (each free-text-per-row or a shared fixed option list) rather than a hardcoded left/right/third, with 8 exported pure mutation helpers in the domain module (not local Fields-component closures, unlike every prior type) so their column/option removal cascade-cleanup invariants stay directly unit-tested. No changes were needed in the already-shipped `MatchingView.tsx` — it already renders as a single fluid accordion at every width, satisfying the mobile "stacked assignment controls" requirement (verified live at a 390px viewport).

**Walkthrough's editor (2026-07-27) is a sixth and final parallel shell** (`domain/cardsV2/walkthroughForm.ts`/`saveWalkthroughCard.ts`, `features/cardsV2/{WalkthroughStepEditor,WalkthroughFields,WalkthroughLivePreview,WalkthroughEditorShell}.tsx`), same reasoning as the previous five — see `itera-decisions.md` D78. As with Matching, not just the Review-time half but the entire model (multi-range `WalkthroughStep.focus`, per-step response union, grading, registry entry, `WalkthroughView`/`StepResponse`, the v1 `story` migrator) already existed from Phase E; only authoring was missing. Steps are authored as a flat, type-irrelevant-fields-ignored shape (mirroring `MatchingColumnFormState`'s `fixed` convention) rather than a discriminated union, with line ranges authored as add/remove start/end row pairs (not a free-text spec) validated against the shared code's actual line count. Two small, additive extensions to already-shipped code were made, not a redesign of the other five types: `ReviewSessionScreen` gained an optional `initialResponse` prop (default `undefined`, every other call site unaffected) so the editor's live preview can jump straight into an arbitrary authored step for inspection — the first interaction type with in-place multi-step navigation, so no prior type's preview ever needed this — and `WalkthroughView` gained explicit focus movement to the new step's panel on `goTo`, the one genuine accessibility gap Walkthrough exposed that nothing else in `reviewV2` needed. Per D69, no separate read-only Card detail screen was built for Walkthrough either — `CardStudyPreviewPage` (rendering the real `WalkthroughView`) plus the row's inline Edit/overflow remains the intended "detail" surface, consistent with all five prior types. The Deck row gained a small, Walkthrough-only `"N steps"` quiet indicator (no other type shows a count).

**Files:** `src/features/cardsV2/` (new: `CardTypeChooser`, `CardCreatePage`, `RecallEditorShell`, `RecallFields`, `RecallLivePreview`, `MultipleChoiceEditorShell`, `MultipleChoiceFields`, `MultipleChoiceOptionRow`, `MultipleChoiceLivePreview`, `WriteCodeEditorShell`, `WriteCodeFields`, `WriteCodeAnswerRow`, `WriteCodeLivePreview`, `OrderingEditorShell`, `OrderingFields`, `OrderingItemRow`, `OrderingLivePreview`, `MatchingEditorShell`, `MatchingFields`, `MatchingColumnEditor`, `MatchingOptionRow`, `MatchingRow`, `MatchingLivePreview`, `WalkthroughEditorShell`, `WalkthroughFields`, `WalkthroughStepEditor`, `WalkthroughLivePreview`, `CardEditEntry`, `CardStudyPreviewPage`, `CardRowV2`, `shared/{OverflowMenu,StatusBadge,InteractionTypeBadge,interactionTypeMeta,format}` — the last four promoted out of `design-preview/library-shared` once a real (not preview-only) consumer needed them) + `src/domain/cardsV2/{recallForm,saveRecallCard,multipleChoiceForm,saveMultipleChoiceCard,writeCodeForm,saveWriteCodeCard,orderingForm,saveOrderingCard,matchingForm,saveMatchingCard,walkthroughForm,saveWalkthroughCard,factory}.ts` + `src/hooks/useCardsV2.ts`. `src/features/cards/CardEditorPage.tsx` itself is untouched — it still owns the other 4 v1 types; `CardEditEntry` is the branch point at `cards/:id/edit`.

**Depends on:** Phase E (editor preview embeds production Review components).
**Acceptance:** creating a Recall, Multiple Choice, Write Code, Ordering, Matching, or Walkthrough card round-trips through save/reload correctly; each editor's preview pane is pixel-identical to the real Review rendering of the same content. All six interaction types are now covered, closing this phase's original acceptance criterion.

## Phase G — Collection/Deck migration (new dedicated phase)

**Goal:** split the current self-nesting `Deck` into `Collection` (nestable, no cards) and `Deck` (flat, holds cards) as a real, explicit, reportable, reversible migration — not a step folded into the Library UI phase.

**Step 1 — Preflight report (must run and be reviewed before anything else in this phase; see full spec in `itera-migration-plan.md` §6).** Produces, from real data, counts of:
- decks with children,
- decks with **both** children and directly-attached cards (the one ambiguous case in the ontology),
- broken parent references,
- cycles,
- cards referencing a missing deck,
- roadmap nodes whose `deckId` will resolve to a Collection (not a Deck) after the split — i.e. Roadmaps whose references would become invalid.

**No remedy for the ambiguous case (decks with both children and cards) is designed in advance.** The previous version of this document proposed auto-creating a "General" deck; that was invented before checking whether the case even occurs. The preflight report's count decides whether a remedy is needed at all, and if so, what shape it takes — decided against real numbers, not speculatively. **In every case, zero cards may be lost or duplicated; this is a hard invariant of the migration, not a target to aim for.**

**Step 2 — Explicit migration**, conforming to the runner contract in `itera-migration-plan.md` §0: dry run producing the same report shape as production data would, deterministic output, idempotent (a deck already converted is a no-op on re-run), before/after entity counts, orphan/duplicate detection, and rollback/restore instructions.

**Step 3 — Roadmap reference handling.** Any roadmap node whose deck becomes a Collection is flagged by the preflight report. Per the corrected Roadmaps default (`itera-decisions.md`), this is where the old Roadmap UI route may be hidden/retired if its references would become invalid — the Roadmap **data** (Supabase table, Dexie store, backup inclusion) is untouched regardless.

**Depends on:** nothing from Phases B–F is required to run the preflight report (step 1) — it's a read-only query against real data and can happen at any time, including before Phase E. The explicit migration (step 2) should run after the preflight report has been reviewed and a remedy (if needed) decided.
**Acceptance:** preflight report produced and reviewed against real data; dry run matches what apply() actually does; apply() is idempotent; zero cards lost/duplicated, verified by count; rollback path documented and would restore the pre-migration state from the `Settings → Export JSON` backup.

## Phase H — Library and Deck UI

**Status (2026-07-26):** a fixture-driven **preview-only** slice shipped ahead of this phase's real dependencies (Phase G's migration, Phase F's Create/Edit) — `/design-preview/library` (Collection nav + Deck list) and `/design-preview/library/:deckId` (focused Deck page, Cards/Insights tabs), built to validate the visual/information-hierarchy direction only. Uses invented local fixture types (`LibraryCollection`/`LibraryDeck`/`LibraryCard` in `src/features/design-preview/library-shared/fixtures.ts`), not the real `Collection`/`Deck`. None of this phase's real deliverables below (`LibraryPage.tsx`, `DeckPage.tsx`, `src/domain/collections/tree.ts`, the global shell rewrite) exist yet, and this preview does not reduce what's left to build in this phase — it only de-risks the design. See `itera-decisions.md` D55-D58.

**Files:**
- `src/features/library/LibraryPage.tsx` (new, replaces `DecksPage.tsx`) — Collection sidebar + Deck list.
- `src/features/library/DeckPage.tsx` (new, replaces `DeckDetailPage.tsx`) — header + Cards tab (existing card-list/reorder logic from `DeckDetailPage.tsx` is reusable) + Insights tab.
- `src/domain/collections/tree.ts` (new, adapted from `src/domain/decks/tree.ts`) — same cycle-safe algorithms, operating on `Collection`.
- **The global shell rewrite happens here, once:** `AppTopNav`/`ProfileMenu`/`CreateMenu` (new, replacing `AppShell.tsx`/`Sidebar.tsx`/`BottomNav.tsx`/`navItems.ts`) is introduced at the start of this phase, since Library is the first production route to move under the new information architecture. Every subsequent production phase (I, J) renders inside this same new shell. Until this phase ships, all existing production routes continue rendering inside the current `AppShell`/`Sidebar` unchanged — including `/roadmaps` and `/roadmaps/:id`, which is exactly why Roadmaps only needs to be addressed (hidden/retired) starting here, not earlier.

**Depends on:** Phase G (the migration must have run and been verified against real data before the UI that assumes the new ontology ships) and Phase F (the "Add Card" action needs Create/Edit built against the new interaction types).
**Acceptance:** every Collection/Deck in the migrated data renders correctly with zero cards lost (verified against Phase G's report); the new global shell replaces the old one for every route that moves in this phase; Roadmaps' route is either still reachable under the old shell (if Phase G found no invalidated references) or explicitly hidden per the corrected default (if it did) — not silently broken.

## Phase I — Today (visual shell shipped early with placeholder content; product logic still unbuilt)

**Status (2026-07-23):** `src/features/today/TodayPage.tsx` exists and renders at `/`, replacing `DashboardPage.tsx` — but built as part of the whole-app visual pass aside above, ahead of Phase H, with a Today-only top-nav shell (not the whole-app shell swap this phase originally specified) and entirely placeholder content. None of the following exist yet: a suggested-session algorithm, streak/momentum tracking, weekly-goal/milestone concepts, or a real pace/projection computation. Continue Learning's rows are static, not sourced from `useDueCards`. See `itera-decisions.md` D50-D54.

**Files:** `src/features/today/TodayPage.tsx` (new, replaces `DashboardPage.tsx`) — suggested-session hero, Momentum, Continue Learning, per spec §12.
**Depends on:** Phase E (Start Session launches the new Review shell), Phase H (Continue Learning rows need the new Deck model and the new global shell to render inside) — the shipped version above bypassed this dependency for the visual shell only, real data wiring still needs it.
**Acceptance (not yet met):** a new user with zero content sees the empty-state variant (§12.5), not blank analytics; every number on the page is real, not illustrative.

## Phase J — Progress

**Files:** `src/features/progress/ProgressPage.tsx` (new, replaces `StatsPage.tsx`), `src/domain/stats/computeStats.ts` (extend, don't rewrite — existing tests cover it).
**Depends on:** Phase H (new shell).
**Acceptance:** one dominant heat map + supporting metrics, not equal-weight stat boxes; empty state per §23.4.

## Phase K — Onboarding + empty states

**Files:** new onboarding flow (`src/features/onboarding/`), empty-state components audited across Library/Deck/Today/Progress/search.
**Depends on:** Phases H, I, J (needs their real empty states to exist, not placeholders).
**Acceptance:** every empty state listed in spec §24.2 exists and has exactly one primary action.

## Phase L — Responsive / mobile

**Depends on:** Phases E, H, I, J, K having their desktop layouts settled.
**Acceptance:** Library uses drill-down/drawer on mobile per §29.1; Review remains one column at every width per §29.2; Matching uses the stepwise mobile flow per §29.4.

## Phase M — Accessibility, performance, and cleanup

**Includes, explicitly:**
- The spec §35.4 accessibility checklist, verified against the interaction-specific criteria in Phase E (not re-litigated generically here).
- **CardState cleanup** (Phase D step 7): remove `scheduling` from `Card`, stop dual-write — only after read cutover has been live and stable for a real observation period.
- Deletion of superseded code: old `src/features/{dashboard,decks,stats}`, superseded v1 card renderers once Phase C's migration has been live long enough that no v1-shaped data is expected to still exist in normal use, old `AppShell`/`Sidebar`/`BottomNav` once every route has moved to the new shell.
- **Roadmap disposition, final call:** if Roadmaps was hidden/retired in Phase H, decide here (as a separate, explicit, non-default decision — see `itera-decisions.md`) whether it is reintroduced against the new `Deck` entity, left retired indefinitely, or — only with separate explicit approval — actually deleted. The default established in this correction pass is **preserve, do not delete**; nothing in this plan changes that default automatically.
- `docs/itera-decisions.md` reconciled against what actually shipped.

## Aside — whole-app visual pass (2026-07-23, not a phase, does not change this sequence)

Separately from the phase sequence below, the product owner asked for the *entire* app to visually reskin to Itera now, rather than waiting for Phase H's real IA rebuild (Library/Deck/global-shell) to reach every page. This does **not** replace or reorder Phases F–M — it's a parallel, visual-only pass: `AppShell.tsx` now wraps every existing v1 page in `IteraSurface` (`.itera-scope` + light-only `ForceLightTheme`), so Dashboard/Decks/Deck Detail/Roadmaps/Browse/Card Editor/Drafts/Stats/Settings all render with Itera colors automatically (see `itera-decisions.md` D45-D49), while keeping today's data model, page structure, IA, and behavior completely unchanged. When Phase H eventually ships the real Library/Deck rebuild and new global shell, it replaces this pass's shell/reskin for the routes it covers — this pass is not meant to be permanent scaffolding, just to get the whole app into the new visual language quickly. Dark mode is off app-wide until an Itera dark palette is designed (Itera's tokens are light-only per spec §36); the toggle is unrendered, not deleted.

**Today (`/`, `src/features/today/`) also shipped this same day, ahead of its documented Phase I position** (which in this plan depends on Phase H's new shell + Phase E). Built directly from a reference mockup the product owner supplied, with its own top-nav shell scoped to just this one route — not the whole-app shell swap Phase H still owns. Content is placeholder/illustrative (no streak, weekly-goal, milestone, or suggested-session logic exists yet); see `itera-decisions.md` D50-D54. This does not mean Phase I is "done" — the real product logic behind every number on this page is still entirely unbuilt, and Phase I's formal acceptance criteria (§ below) are unmet.

**Library (`/design-preview/library`, `/design-preview/library/:deckId`) shipped 2026-07-26, similarly ahead of its documented Phase H position** — a preview-only, fixture-driven slice for visual-direction approval, isolated under `src/features/design-preview/library-{shared,browser,deck}/`, not the real `LibraryPage`/`DeckPage`/global-shell rebuild Phase H still owns. See `itera-decisions.md` D55-D58 and the Phase H status block above.

**Same day, a follow-up pass completed the Library browser against a newly supplied browse-view mockup** (`itera-mockups/webapp/all-decks.png` — D56 had noted no such mockup existed yet): a real Collection drill-down drawer at narrow widths replacing the flattened tab-row stand-in, `DeckRow` restructured into grid columns matching `CardRow`'s existing convention, an inert add-Collection stub, a compact Filter control, a demonstrable empty-library route, and a cross-page navigation fix so the Deck page's Collection nav/breadcrumb preserves the clicked scope. See `itera-decisions.md` D59-D63. This still does not reduce what Phase H must build for real — same caveat as above.

## Phase order summary

A → B, C (parallel, both additive) → D, E (parallel, meeting at the `ReviewService` boundary) → F → G (preflight can start anytime after A) → H → I, J (parallel) → K → L → M.

## What the first implementation pull request covers (shipped — 2026-07-23)

- `src/index.css` — additive Itera token scope (`.itera-scope`) + additive `@theme inline` lines + a namespaced `.itera-flip*` mechanism. Nothing existing changed.
- `src/app/theme.tsx` — **the one existing production file touched**: `ThemeContext` gained an `export` keyword. Purely additive; every existing consumer (`useTheme`/`ThemeProvider`) behaves identically.
- `src/types/cardV2.ts`, `src/domain/migration/cardMigration.ts` (+ an added idempotence test) — Phase C's first slice.
- `src/features/reviewV2/components/{FlashcardSurface,FlipCard,InteractionLabel,TipPanel,ExplanationPanel,RatingControls}.tsx` — the reusable v2 Review components, exercised by this slice and intended for direct reuse in Phase E.
- `src/features/design-preview/{PreviewShell,ForceLightTheme,fixtures}.tsx` and `review-recall/{RecallCardDemo,RecallPreviewPage}.tsx` (+ `RecallCardDemo.test.tsx`, 9 tests) — the preview route itself.
- `src/app/router.tsx` — one additive top-level route entry (`design-preview`, sibling of `/`, not nested under `AppShell`).
- `package.json`/`package-lock.json` — four new devDependencies (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/dom`, `happy-dom`) for the one component test file; no production dependency changed.

No existing file under `src/features/{cards,decks,dashboard,review,stats,roadmaps}` or `src/components/layout` was modified. No Supabase or Dexie schema changes — those begin with Phase D and Phase G, each its own explicit, reportable migration before any UI depends on it.

**Verification:** typecheck clean, lint clean, 92/92 tests pass (14 files), production build succeeds. Both `/` and `/design-preview/review/recall` confirmed reachable (HTTP 200) against the dev server. Actual rendered appearance was **not** visually verified — no browser/screenshot tool available in this environment.
