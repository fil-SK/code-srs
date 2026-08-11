> **HISTORICAL DOCUMENT — not a current source of truth. Preserved for project history only.**
>
> Archived 2026-08-12. This is the **Phase A audit snapshot, taken 2026-07-22**, describing the repository *before* the Itera redesign began. Almost everything in §3's conflict table has since changed: the 8-item left sidebar, `BottomNav`, `navItems.ts` and the purple/navy palette are gone; Review, Library, Progress, Settings and Login have been rebuilt; a v2 card model, a `cardsV2` store and a `cardStates` store now exist.
>
> Rows carrying a later "Resolved"/"Confirmed"/"Shipped" annotation were updated in place while this was still live; **unannotated rows are simply stale, not open**. Do not read any row as current state.
>
> For current state read [`../CURRENT_STATE.md`](../CURRENT_STATE.md); for how the system is structured read [`../architecture.md`](../architecture.md). The durable findings this audit produced — the storage seam being sound, the registry dispatch pattern being the right mechanism, content/scheduling separation being mandatory, the FSRS wrapper needing golden tests, and the data risks around two live backends — are carried forward in [`../architecture.md`](../architecture.md) and [`../itera-migration-plan.md`](../itera-migration-plan.md).

# Itera — Repository Audit (Phase A)

Audited 2026-07-22 against `itera_claude_master_spec.md` (now [`itera-claude-master-spec.md`](itera-claude-master-spec.md), also archived). No production code was changed to produce this document. All file paths are relative to the repo root.

## 1. How the current application works

**Stack:** Vite 8, React 19, TypeScript 6, Tailwind v4 (CSS custom properties + `@theme inline`, not a static config file), React Router 7 (`createBrowserRouter`), TanStack Query 5 for all data access, Dexie 4 (IndexedDB) + optional Supabase (Postgres) behind one interface, `ts-fsrs` for scheduling, CodeMirror 6 lazy-loaded, `vite-plugin-pwa`.

**Storage seam** (`src/data/repository.ts`, `src/data/index.ts`): one `Repository` interface with two interchangeable implementations — `DexieRepository` (default, offline) and `SupabaseRepository` (used automatically when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set). Both store each entity as a full JSON object keyed by `id` (Postgres: `data jsonb` + a few generated columns for indexed queries like `due`/`suspended`/`deck_id`; Dexie: a plain object + IndexedDB indexes). All filtering (text search, tag/type filters) happens **in memory identically on both backends**, so behavior never diverges. This seam is backend-agnostic to the rest of the app and requires no rewrite for the redesign.

**Card model** (`src/types/card.ts`): `Card` is a discriminated union on `type`, currently 8 variants: `basic`, `mcq`, `codeReading`, `codeCompletion`, `bugFinding`, `ordering`, `matching`, `story`. Every type is registered as one `CardTypeDefinition<T>` (`src/features/cards/registry/types.ts`) bundling `emptyContent`, `isComplete`, optional `autoGrade`/`isResponseReady`, and three components (`Question`, `Answer`, `Editor`). Registration is an exhaustive `Record<CardType, …>` in `src/features/cards/registry/index.ts`, so a new/removed type fails to compile until every call site is updated. `CardView`, `ReviewSession`, and `PreviewPage` render **any** type generically through this registry with zero per-type branching. **This dispatch pattern is exactly the mechanism the spec asks for in §30.4** — only the taxonomy and payload shapes need to change, not the architecture.

**Scheduling** (`src/domain/scheduling/scheduler.ts`, `state.ts`): a small, well-isolated wrapper around `ts-fsrs`. `reviewState()` maps our `SchedulingState` ↔ FSRS's `CardInput`/`Card` and applies a grade; `previewStates()` computes the would-be next state for all four ratings (used to label the grade buttons); `buildReviewLog()` assembles an immutable log row from the exact before/after states (not read back from FSRS's own log, so recorded deltas are exact). Manual, field-by-field review of the mapping against ts-fsrs's types found no defects. **This is a code-review finding, not a test-verified one** — `scheduler.test.ts` exists and gives basic behavioral coverage (Good advances reps/due, Again scheduled sooner than Easy, log deltas recorded correctly, interval formatting), but has no golden/invariant tests against known reference values or multi-review sequences (repeated lapses, learning→relearning transitions, long histories). See §4 for the corrected framing, and `itera-migration-plan.md` §9 for the tests this needs before Phase D relies on it as a fully verified boundary.

**Review flow** (`src/features/review/useReviewSession.ts`, `ReviewSession.tsx`, `useReview.ts`): a hook snapshots the due queue at mount (so grading doesn't reshuffle it mid-session), and drives `presenting → revealed → submitGrade → next` with an in-memory undo stack of `{card, logId}` pairs. `useGradeCard()` (`src/hooks/useReview.ts`) computes the next `SchedulingState`, **writes it back onto the same `Card` row** via `repo.cards.put({...card, scheduling: after})`, and appends a `ReviewLog`. Undo restores the pre-grade card verbatim from the in-memory stack and deletes the log row.

**Deck model** (`src/types/deck.ts`, `src/domain/decks/tree.ts`): one flat `Deck` entity that self-nests via `parentId`. `buildDeckTree`/`subtreeIds`/`flattenDeckTree` are cycle-safe (a deck whose parent is itself, or forms a cycle, becomes a root rather than vanishing or looping). Cards attach to a deck directly via `deckId`. There is **no separate Collection entity** — the one `Deck` type currently plays both the spec's "Collection" role (nestable, organizational) and "Deck" role (flat, holds Cards) simultaneously.

**Markdown & code:** `src/components/text/RichText.tsx` is a zero-dependency, XSS-safe markdown renderer (inline code, bold, italic, fenced blocks; underscores are deliberately not emphasis markers, so `snake_case` renders literally). `CodeView`/`LazyCodeEditor` wrap CodeMirror 6, lazy-loaded via dynamic `import()` wrapped in `src/lib/lazyWithRetry.ts` (reloads once if a chunk 404s after a redeploy). `CodeView` already supports per-line highlight decorations (`highlightLines` prop, `src/components/code/lineRanges.ts`) — added this session for Story cards, and directly reusable for the spec's Walkthrough `focus: {startLine, endLine}`.

**Shell** (`src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `navItems.ts`): a fixed 248px sidebar with 8 items (Dashboard, Decks, Roadmaps, Review, Browse, Drafts, Stats, Settings), a sticky header with page title/subtitle plus a "Study now" button that **duplicates** the Review sidebar entry, and a bottom nav mirroring the same items (minus Settings) on mobile.

**Visual tokens** (`src/index.css`): semantic CSS variables swapped via `[data-theme]` (explicit toggle, not `prefers-color-scheme`). Light accent `#6d57e0`, dark accent `#8b7cf6` — a purple accent on a navy-black dark background (`#0b0e14`) and light-gray light background (`#f4f5f8`). One radius token (`--radius-card: 12px`) used almost everywhere. This is precisely the "dark navy and purple palette" and "everything is a rounded rectangle" the spec asks to discard — but the **mechanism** (CSS custom properties + Tailwind `@theme inline`) needs no rewrite, only new token values.

**Auth** (`src/auth/`): `AuthGate` only gates the app when Supabase is configured; local mode has no login at all. This already satisfies the spec's local-first requirement (§25.1) without changes.

**Testing (at Phase A audit time):** Vitest, 12 files / ~75 tests, colocated as `*.test.ts`, hermetic (`vitest.config.ts` blanks the Supabase env vars so the suite always exercises Dexie via `fake-indexeddb`, never the network). Coverage was domain-logic-focused (scheduler, backup, deck tree, stats, grading, several card-type renderers); at the time, there were **no component or interaction-level tests** for the Review UI. *(No longer current — since Phase B, component tests exist via a per-file `// @vitest-environment happy-dom` opt-in, including `ReviewSessionScreen.test.tsx` and per-interaction view tests for Ordering/Matching/Walkthrough. See `CLAUDE.md`'s Commands section for the up-to-date testing setup rather than this count.)*

**Import/export** (`src/domain/io/backup.ts`, `src/data/backup.ts`): a versioned envelope (`BACKUP_VERSION`, currently `1`) containing every entity array. New entity types were added as **optional** fields (see `roadmaps?: Roadmap[]`) so older backups still validate — a pattern already proven and directly reusable for the spec's `schemaVersion` migrations.

## 2. What is structurally sound

- The repository/backend seam — do not touch.
- The FSRS wrapper — well-isolated, reviewed with no defects found, keep as-is; needs golden/invariant tests added (not a rewrite) before being relied on as a fully verified boundary (§4).
- The card-type registry dispatch pattern — keep the mechanism, change the taxonomy.
- The markdown renderer and lazy CodeMirror loading (including stale-chunk recovery and line highlighting) — keep as-is.
- Deck-tree algorithms (cycle-safe nesting, flattening with path) — reusable for the new Collection tree with light adaptation.
- The backup/versioning skeleton — reusable for schema migration, needs a version bump and per-type migrators, not a rewrite.
- Auth gating — already matches the spec's local-first-by-default model.
- No dead code, no `TODO`/`FIXME`/deprecated markers found beyond two legitimate hits (`useDeferredValue` and a genuinely-planned-later `CodeValidationMode` variant). The codebase is consistent and was not found to contain unsafe or half-finished AI-generated abstractions.

## 3. What is incomplete or conflicts with the specification

| Area | Current state | Spec requirement | Conflict severity |
|---|---|---|---|
| Card/CardState separation | `scheduling: SchedulingState` lives **inside** `Card`; graded in the same `repo.cards.put()` write as content | Card (content) and CardState (scheduling) must be separate entities/tables (§7.6) | **High** — this is a structural, not cosmetic, gap |
| Deck/Collection ontology | One `Deck` entity, self-nesting; holds Cards directly at any depth | Collection (nestable, no Cards) and Deck (flat, holds Cards, cannot nest) must be distinct (§7.2–§7.3) | **High** — largest single migration |
| Card taxonomy | 8 types (`basic`, `mcq`, `codeReading`, `codeCompletion`, `bugFinding`, `ordering`, `matching`, `story`) | 6 interaction types (`recall`, `multiple_choice`, `write_code`, `ordering`, `matching`, `walkthrough`), with `authoringPreset` distinguishing Recall variants (§8.1) | **Medium** — mapping is 1:1 or many:1, mechanical but touches every renderer |
| Tip field | Does not exist on any card type — only `explanation` | Tip (before answer) and Explanation (after answer) are distinct, both optional (§10.1) | **Medium** — new field, straightforward to add |
| ReviewEvent shape | `ReviewLog` has no `sessionId`, no `interactionType`, no separate `objectiveResult` vs `rating`, no full before/after state snapshot (only stability/difficulty deltas + resulting `state`) | Richer `ReviewEvent` shape (§9.3) | **Low-medium** — spec explicitly allows adapting field names/shapes to the project; current shape is internally consistent, just narrower |
| Global shell | Permanent 8-item sidebar, header "Study now" duplicates the Review nav entry, purple/navy palette, uniform 12px rounding everywhere | Horizontal top nav (Today/Library/Progress/Create), restrained orange-on-navy-and-white, structured-softness shape language (§4, §11) | **Partially addressed, 2026-07-23** — the palette/radius/typography gap is closed app-wide (`AppShell` now wraps every route in `IteraSurface`, shell chrome got manual radius/type detailing per `itera-decisions.md` D45-D48), but the *structural* gap (8-item sidebar, duplicate "Study now" entry, no horizontal top nav) is untouched outside `/` — that's still Phase H's `AppTopNav` rewrite, not started. |
| Today (`/`) shell | *(new row, not in the original Phase A audit)* — `/` still rendered `DashboardPage.tsx` inside `AppShell`'s sidebar at audit time | Horizontal top nav, suggested-session hero, Momentum, Continue Learning (§12) | **Shipped ahead of Phase I, 2026-07-23** — `TodayPage` now owns `/` with its own top-nav shell (scoped to that one route only), built from a reference mockup. Content is placeholder/illustrative, not real product logic. See `itera-decisions.md` D50-D54. |
| Review shell | Shows `CardTypeBadge` + tags **above** the active card during review | Review must show nothing but the card, tip, explanation, and rating controls — no type badge, no metadata (§15.1) | **Resolved for production, 2026-07-23** — the live `/review` route now renders through the v2 `ReviewSessionScreen` shell (no type badge/metadata chrome, meets §15.1), not the old `ReviewSession.tsx` this row describes. The old component is unmodified and still in the tree, unreferenced. See `itera-decisions.md` D35. |
| Roadmaps | A full feature (entity, repo methods, nav item, routes, hand-built SVG canvas) shipped **this session**, live in production | Explicitly listed under Deferred Scope: "Do not implement... unless explicitly requested" (§36) | **Confirmed 2026-07-23** — excluded from the redesigned MVP navigation, receives no new development. Data (type, repo methods, Supabase table + policies, backup compatibility) is preserved; its UI route may be hidden/retired before Phase G if warranted; destructive deletion still needs separate explicit approval. See `itera-decisions.md` D17. |
| Product name/brand | "code-srs" throughout: `package.json` name, PWA manifest (`vite.config.ts`), README, GitHub repo, live domain `code-srs.vercel.app` | Product is "Itera," locked name and logo (§4.1–§4.2) | **Confirmed 2026-07-23** — apply Itera name/logo/palette/icons/theme colors/PWA identity/UI copy/README now; GitHub repo, Vercel domain, and `package.json` name unchanged for now. See `itera-decisions.md` D18. |

## 4. FSRS integration assessment

**Field-mapping reviewed and found consistent; not yet independently test-verified.** `toCardInput`/`fromCard` in `scheduler.ts` map every field ts-fsrs's `CardInput`/`Card` expects (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review`), including the `State` enum ↔ our `SchedulingStateKind` string union. Grades map directly (`Rating 1..4` ≡ FSRS `Grade`). `previewStates()` correctly uses `scheduler.repeat()` to compute all four next-states for the grade-button labels without mutating anything. Manual review found no correctness issues. However: this is a code-review conclusion, not a testing conclusion, and should not be described as "operationally verified" on that basis alone. `scheduler.test.ts` covers basic behavior (single-review advancement, relative ordering of grades, log delta recording) but has no golden/invariant tests against known ts-fsrs reference values or multi-review sequences. **Adding those tests is a named prerequisite in `itera-redesign-plan.md` Phase D**, before CardState extraction leans on this module as a fully verified boundary. Separately (not a correctness question): `SchedulingState` is embedded in `Card` rather than separated — see §3 above.

## 5. Is user progress safely separated from card content?

**No — this is the audit's most important finding.** Content and scheduling state are the same row today: editing a card's prompt and grading a review both go through `repo.cards.put()`. There is no `CardState` table/entity. This must change before any future shared/purchased-deck feature (per §7.6, this separation is explicitly "mandatory for future shared or purchased Decks"), and it is also the riskiest single change to make correctly, because it sits on the hot write path for every review a user has ever done.

## 6. Risks to existing user data

1. **Two live storage backends** (Dexie in every user's browser, Supabase in production) must be migrated **in lockstep** — any schema change needs a Dexie `version()` bump and a corresponding Supabase migration, or the two backends silently diverge.
2. **The Deck→Collection+Deck split** can orphan or duplicate cards if the migration logic is wrong. Mitigated by requiring a mandatory preflight report (decks with children, decks with both children and cards, broken references, cycles, orphaned cards, affected Roadmap references) before any migration runs, plus a dry-run/apply/rollback contract — see `itera-migration-plan.md` §0 and §6, and `itera-redesign-plan.md` Phase G. No remedy for the ambiguous cases is designed until the report proves they exist.
3. **Card/CardState separation** touches `createCard` (`src/domain/cards/factory.ts`), `useGradeCard`/`useUndoGrade` (`src/hooks/useReview.ts`), Dexie schema, Supabase schema + RLS + grants, and backup export/import — a mistake here risks corrupting scheduling state for the entire existing card library, live in production. Mitigated by treating this as its own phase (Phase D) with additive schema, backfill, dual-write, parity verification, and read cutover as separate, reversible steps — not a single cutover.
4. **The 8→6 taxonomy consolidation** changes payload shapes, not just labels (new `tip` field, `RichContent` wrapper, `authoringPreset`); needs one migrator per old type, applied idempotently, with the existing exhaustive-switch compile-time safety net kept intact. (This part is lower-risk than 2/3 above — it's a pure content reshape with no cross-entity references, which is why it's the one migration allowed to run lazily on read; see `itera-redesign-plan.md` Phase C.)
5. **A full rebrand** (name/logo) affects the GitHub repo name, the Vercel project and its `code-srs.vercel.app` domain, the PWA manifest identity (a changed manifest `name`/icon can cause some platforms to treat an already-installed PWA as a *different* app), and the `CLAUDE.md`/`.claude/` docs written this session. Scope now confirmed as in-app only for this redesign (`itera-decisions.md` D18) — the repo/domain rename risk itself is simply deferred, not eliminated, for whenever that's revisited.
6. **No safety net for the Review UI rewrite** — only domain logic is tested today; a ground-up shell/interaction rewrite has no regression coverage at the component level. See the required test list in `itera-migration-plan.md` §9.
7. **Roadmap data must not be destroyed as a side effect of the ontology migration** — Phase G's preflight report explicitly checks for roadmap nodes whose `deckId` would become invalid; the corrected default response is to hide/retire the affected UI, never to delete the underlying data without separate explicit approval.

## 7. Retain / Migrate / Rewrite / Delete map

**Retain as-is:**
- `src/data/**` (repository seam, both backends)
- `src/domain/scheduling/**` (FSRS wrapper)
- `src/components/text/RichText.tsx` (markdown renderer)
- `src/components/code/CodeView.tsx`, `LazyCodeView.tsx`, `LazyCodeEditor.tsx`, `lineRanges.ts`, `src/lib/lazyWithRetry.ts`
- `src/domain/decks/tree.ts` (algorithms; the entity it operates on will change)
- `src/domain/io/backup.ts` (versioning skeleton)
- `src/auth/**`
- `src/features/cards/registry/**` (the dispatch pattern; contents change)
- Test conventions (colocated, hermetic)

**Migrate (shape/data changes, logic mostly reusable):**
- `src/types/card.ts` — 8 types → 6 interaction types
- `src/types/deck.ts` → split into `Collection` + `Deck`
- `src/types/review.ts` — extract `CardState`, enrich `ReviewLog`/`ReviewEvent`
- Dexie schema (`src/data/dexie/db.ts`) and Supabase schema (`supabase/schema.sql`) — new tables/columns, version bump
- `src/domain/io/backup.ts` — `BACKUP_VERSION` bump + migrator functions
- Every card-type `Editor.tsx` — add Tip field, adapt to new payload shapes

**Rewrite:**
- `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `navItems.ts` → top nav + Create menu + Profile
- `src/features/dashboard/DashboardPage.tsx` → Today
- `src/features/decks/DecksPage.tsx`, `DeckDetailPage.tsx` → Library (Collection tree + focused Deck page with Cards/Insights tabs)
- `src/features/review/ReviewSession.tsx` → strip type badge/tags from the shell; keep `useReviewSession.ts`'s state machine, which is already sound
- `src/features/stats/StatsPage.tsx` → Progress (different visual hierarchy: one dominant heat map, not equal stat boxes)
- `src/index.css` token values, `vite.config.ts` PWA manifest

**Hide/retire, do not delete (Phase G/H, per the corrected non-destructive default — see `itera-decisions.md`):**
- `src/features/roadmaps/**`'s **route** may be hidden from navigation once Phase G's migration would make its Deck references invalid. The `Roadmap` type, repo methods (both backends), the Supabase `roadmaps` table, and its inclusion in backups are **not deleted** by this redesign. Destructive deletion is a separate decision requiring explicit approval, not scheduled here.

## 8. Blockers / questions for the product owner

Both confirmed 2026-07-23 — see `itera-decisions.md` D17 (Roadmaps) and D18 (rebrand scope). No open blockers remain from the original audit.
