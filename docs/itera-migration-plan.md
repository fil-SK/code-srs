# Itera — Migration Plan

**Canonical, living document.** The data-migration and data-safety contract for this project. Covers both storage backends (Dexie in every user's browser; Supabase in production) — they must move in lockstep or they will silently diverge.

**Most of this plan is now history.** The card-model half of it is finished, but not the way it was designed: on 2026-08-18 the v1/v2 split was resolved by **converging on one `Card` model and resetting the prototype card data**, rather than by migrating it (see `itera-decisions.md` D190-D196). §1 (lazy card-payload adaptation) and §4 (CardState extraction) describe code and entities that no longer exist. What remains live is §0's contract, §6's Collection/Deck split, and the §7/§8 conventions.

**No migration may run lazily on read.** That exemption existed solely for `migrateCard`, which is deleted.

## Status at a glance (verified against the working tree, 2026-08-18)

| Migration | Status |
|---|---|
| §1 — Card payload 8 → 6 (lazy on read) | **Void.** Superseded by the single-card-model convergence: there is no v1 payload left to adapt, and `migrateCard` is deleted. |
| §2 — Schema versioning / `BACKUP_VERSION` bump | **Done, differently.** `BACKUP_VERSION` is `2`, and `parseBackup` also enforces a `MIN_SUPPORTED_BACKUP_VERSION` of 2 — version-1 files are refused outright rather than auto-migrated, because their card shape no longer exists. `Card.schemaVersion` is on every card, and since 2026-08-18 an imported card's `schemaVersion` is checked against `CARD_SCHEMA_VERSION` rather than merely being present, so a card written for another model is refused at the entity level too (`src/domain/io/validateBackupEntities.ts`; see `itera-decisions.md` D198-D201). |
| §4 — CardState extraction | **Void.** The `cardStates` store, its backfill runner and its Settings UI were removed with the convergence; nothing had ever read from them. Scheduling lives on `Card.scheduling`. Re-separating content from learning state is still a legitimate future goal (`architecture.md` principle 4) but would be designed fresh, against real data. |
| §5 — Preserve richer Matching/Walkthrough capability | **Completed and honored** in the shipped types, editors and graders. |
| §6 — Deck → Collection + Deck split | **Not started.** Even the read-only preflight report (§6.1) has never been run. The Library ships against a UI-only `parentId` derivation instead. **This is the only live migration left in this plan.** |
| §8 — Versioned Supabase migration files | **Implemented.** `0001_card_states.sql` and `0002_single_card_model.sql`. The latter drops `card_states`/`cards_v2` and recreates one `cards` table; it is destructive by design (see its header). |
| §9 — Required test coverage | **Partially implemented.** The v1-backup-import items are void along with §1. |

**Do not rewrite a completed row above as though it were future work**, and do not start a "not started" migration as a side effect of a UI change. The current implementation snapshot lives in [`CURRENT_STATE.md`](CURRENT_STATE.md) §13.

## 0. Shared migration-runner contract

Every migration in this plan must conform to this contract before it is implemented. The contract itself lives in `src/domain/migration/runner.ts`; nothing implements it today, since the two migrations that did were retired with the card-model convergence.

```ts
interface MigrationReport {
  beforeCounts: Record<string, number> // e.g. { decks: 42, cards: 310 }
  afterCounts: Record<string, number>
  changed: string[]   // ids actually touched (empty on a dry run)
  skipped: string[]   // ids already in the target shape — proves idempotence
  orphans: string[]   // ids that would be/were left unreachable
  duplicates: string[] // ids that would be/were duplicated
  warnings: string[]  // ambiguous cases the migration had to make a call on
}

interface MigrationRunner {
  // No writes. Deterministic: same input data always produces the same report.
  dryRun(): Promise<MigrationReport>
  // Performs the writes described by dryRun(). Idempotent: running apply()
  // twice in a row produces the same end state, and the second run's report
  // shows everything as `skipped`, nothing as `changed`.
  apply(): Promise<MigrationReport>
  // Human-readable instructions for restoring pre-migration state, referencing
  // the `Settings -> Export JSON` backup taken immediately before apply().
  rollbackInstructions(): string
}
```

Requirements this implies:
- **Dry run before apply, always**, and the dry run's report is reviewed by a human before `apply()` runs against real data.
- **Idempotent** — re-running `apply()` (e.g. after a partial failure) must not duplicate or corrupt anything; already-migrated entities are detected and skipped.
- **Deterministic** — no randomness, no wall-clock-dependent branching, so the same input always yields the same output and the dry-run report is trustworthy.
- **Orphan and duplicate detection** are first-class outputs of the report, not something inferred after the fact.
- **Rollback** is always "restore from the pre-migration `Settings → Export JSON` backup," which already exists and works today — no new export tooling is required, only the discipline of taking one immediately before `apply()`. Since 2026-08-22 (audit P1-1, decisions D240-D242) that restore is a genuine all-or-nothing operation on the local backend: `repo.replaceAll()` runs the clear and the write in one Dexie transaction, so a rollback that fails leaves the workspace exactly as the failed migration left it rather than emptying it. **On the Supabase backend replace-import is refused**, so a cloud rollback currently has no one-step path and this precondition is not satisfied there.

## 1. Card type migration (8 → 6) — the one migration allowed to run lazily on read

Mapping (spec §33.2, applied to this codebase's actual type names in `src/types/card.ts`):

| Old `type` | New `interaction.type` | `authoringPreset` | Notes |
|---|---|---|---|
| `basic` | `recall` | `standard` | `front`→`prompt`, `back`→`answer`, `explanation`→`explanation` (unchanged) |
| `codeReading` | `recall` | `code_reading` | `code`+`question` fold into `prompt` as a fenced block + text; `answer` unchanged |
| `bugFinding` | `recall` | `find_the_bug` | `code`+`question` fold into `prompt`; `bugHint` becomes `tip` (new field — see §3); `explanation` (required today) becomes the `answer` |
| `mcq` | `multiple_choice` | — | `options`/`correct`/`multiple` map directly to `options[].correct`/`selectionMode` |
| `codeCompletion` | `write_code` | — | `scaffold` → `starterCode`; `solutions` → `acceptedAnswers`; `validation.{ignoreWhitespace,caseSensitive}` map directly to `comparison.*` |
| `ordering` | `ordering` | — | `items` map directly; already stored in correct order, matches `correctOrder` |
| `matching` | `matching` | — | `pairs`/`triple`/`options` map to `columns`/`relationships`, preserving 3-part and fixed-option-column capability — see §5, locked per `itera-decisions.md` D13 |
| `story` | `walkthrough` | — | `intro`+`code`+`image` → `scenario`+`code`+`image`; `steps[]` map to `steps[]`; `highlight` (line spec string) → `focus: Array<{startLine, endLine}>` (multiple ranges, preserved — see §5, locked per D13) |

Every old type's optional `explanation` field maps to the new `explanation` field (post-answer) — **not** to `tip`. Tip is a genuinely new, currently-unpopulated field; no existing content is auto-assigned into it (per spec §33.4 — `bugFinding.bugHint` is the one exception, since it already is a pre-answer hint).

**Status:** implemented and tested. `src/domain/migration/cardMigration.ts` (`migrateCard`) covers all 8 old types; `cardMigration.test.ts` has 12 passing tests, including an explicit idempotence test (added since this section was first written). Still needed (see §9): a real-export smoke test and the v1→v2 backup auto-import test once `BACKUP_VERSION` bumps.

## 2. Schema versioning

- Bump `BACKUP_VERSION` in `src/domain/io/backup.ts` from `1` to `2` once the v2 `CardV2`/`Deck`/`Collection` types are wired into the app (not yet — only the types and the pure migrator exist so far).
- Add `schemaVersion` to each `Card` (already present on `CardV2`; the current v1 `Card` has no per-entity version, only the backup-envelope version). Cards without a `schemaVersion` are treated as `1` (implicit) and run through `migrateCard` on read.
- `parseBackup()` already rejects `obj.version > BACKUP_VERSION` with a friendly error — this guard stays unchanged. Add the mirror-image behavior: a v1 backup imports successfully into a v2 app (auto-migrated via `migrateCard`, not rejected). See the required test in §9.

> **Superseded — read the status table above, not the three bullets in this section.** They describe the plan as written before the convergence. What actually shipped: `BACKUP_VERSION` is `2`; `Card.schemaVersion` is required and checked against `CARD_SCHEMA_VERSION`; and a v1 backup is **refused, not auto-migrated**, because `migrateCard` and the shape it produced are both deleted (D195, D201). The bullets are kept because §9's test list references them.

## 3. Why only §1 is lazy-on-read

`migrateCard` runs on old Card content read from storage and returns the new shape, with no mandatory one-shot rewrite. This is safe **specifically because** it is a pure content reshape: it doesn't change which row an entity lives in, doesn't touch cross-entity references (`deckId` stays a `deckId`), and doesn't touch any indexed/generated column. A card's identity, ownership, and relationships are untouched — only how its own `content`/`type` fields are shaped.

**This does not generalize to CardState extraction (§4) or the Collection/Deck split (§6).** Both of those change either where data lives (CardState moves to a new table/store) or what an entity *is* (a Deck becomes a Collection, or stays a Deck) — including references other entities hold to it. An on-read shim for either would mean the app runs, silently and indefinitely, on a mix of migrated and unmigrated entities with no report of which is which, no detectable idempotence, and no way to know when it's safe to remove the old shape. That is a materially different risk profile from §1, which is why §4 and §6 use the explicit contract in §0 instead.

## 4. Card/CardState separation

**Status: steps 1-3 completed (2026-07-23); steps 4-6 not started.** Additive Dexie (`version(3)`, `cardStates`) and Supabase (`supabase/migrations/0001_card_states.sql`) schema, a tested backfill (`src/domain/migration/cardStateBackfill.ts`) exposed as a dry-run/apply UI in **Account settings → Card scheduling**, and dual-write from every write path are live — see `itera-decisions.md` D38-D44 for exactly what shipped. The steps below are the original plan and remain accurate as written; only the status has changed, not the design.

Currently `Card.scheduling: SchedulingState` (see `src/types/card.ts`, `CardBase`). Steps (each independently deployable and reversible):

1. **Additive schema.** A versioned migration file (§8) adds a `card_states` table (Supabase) / `cardStates` store (Dexie), keyed by `cardId`, holding the current `SchedulingState` shape. Nothing existing changes.
2. **Backfill.** A `MigrationRunner` (§0) that writes one `CardState` row per existing `Card`, copied from `card.scheduling`. Dry run first; the report's `beforeCounts`/`afterCounts` prove every card got exactly one row, and `orphans` proves none were missed.
3. **Dual-write.** `createCard` (`src/domain/cards/factory.ts`) and `useGradeCard`/`useUndoGrade` (`src/hooks/useReview.ts`) write to **both** `Card.scheduling` and the new `CardState` row, via the `ReviewService` boundary (`src/domain/scheduling/reviewService.ts`). Reads still come from `Card.scheduling` — nothing observable changes.
4. **Parity verification.** Compare every `Card.scheduling` against its `CardState` row over a real observation period; they must never diverge under dual-write. This is where the golden/invariant FSRS tests from §9 matter — without them, "parity" only proves the two write paths agree with each other, not that either is correct.
5. **Read cutover.** Once parity holds, reads (`getDue()` in both backends, and everywhere else that reads `card.scheduling`) switch to `CardState`. Writes to `Card.scheduling` continue (now redundant, but harmless) until cleanup.
6. **Cleanup — a later release, not this phase.** Only after read cutover has been live and stable for a real observation period does `scheduling` get removed from `Card` and dual-write stop.

Rollback at any point before step 5 ships: stop before that step: `card_states` is purely additive and can be dropped with zero data loss, since `Card.scheduling` was never stopped. After step 5 ships, rollback is reverting the read to `Card.scheduling` (which dual-write has kept current).

## 5. Locked: richer functionality is preserved, not downgraded

Per `itera-decisions.md` D13, explicitly locked by the product owner (not a default-absent-objection):

- **Walkthrough supports multiple highlighted line ranges** (`WalkthroughStep.focus: Array<{startLine, endLine}>` in `src/types/cardV2.ts`), not the spec's illustrative single-range shape. A highlight spec like `"26-34, 40"` converts to `[{startLine:26,endLine:34},{startLine:40,endLine:40}]` with no loss.
- **Walkthrough supports optional guidance at both scopes.** `CardV2.tip`/`explanation` remain card-wide, while each `WalkthroughStep` may additionally carry optional `tip`/`explanation`. The step fields are additive properties inside the existing opaque JSON blob: older records and v1 Story migrations may omit them, so no storage migration or eager rewrite is required.
- **Matching preserves its existing 3-part and fixed-option-column capability.** `MatchingInteraction` uses a general `columns: MatchingColumn[]` / `relationships: Array<Record<string,ID>>` shape (already implemented in `src/types/cardV2.ts` and `src/domain/migration/cardMigration.ts`) rather than the spec's fixed two-column `sources`/`targets` example. Fixed columns (shared value list, graded by value equality) and the third column both migrate without modification.
- **The data model may be more general than the initial MVP UI.** Phase E's Matching UI can ship a simpler two-column presentation first if that's the right sequencing call for the redesign, but the *data* it operates on already supports the richer shape — nothing about the UI's rollout order requires downgrading what's stored.
- **`bugFinding.explanation` is required today** (unlike every other type's optional `explanation`) and semantically serves as the answer, not a post-answer aside. It maps to `interaction.answer`, and the migrated Recall card has no `explanation` populated unless authored later — expected, not a bug.

## 6. Deck → Collection + Deck split

**Status: not started.** Neither the preflight report nor any migration code exists; there is no `Collection` type, no `collections` table, and no `src/domain/collections/tree.ts`. The Library UI ships against a **UI-only** derivation (`src/features/library/collectionTree.ts`: any deck with children is treated as a Collection node) which moves and transforms no data at all. That derivation is not a substitute for this migration, and shipping it did not advance it.

**No remedy for any ambiguous case is designed before the preflight report proves it occurs** (`itera-decisions.md` D15) — this corrects the previous version of this document, which proposed auto-creating a "General" deck speculatively.

### 6.1 Preflight report (required, reviewed by a human, before any migration code runs)

Read-only queries against real data (Supabase `decks`/`cards` tables, or the Dexie equivalent client-side), producing counts and, where relevant, the actual affected IDs:

1. **Decks with children** — `parentId` chains where a deck has at least one child deck. These become Collections.
2. **Decks with both children and directly-attached Cards** — the one case the ontology can't represent directly (a Collection can't hold Cards). Report the exact decks and how many cards each has, not just a total count.
3. **Broken parent references** — a deck's `parentId` points at a deck that doesn't exist.
4. **Cycles** — a deck is its own ancestor through some chain of `parentId`s. (`src/domain/decks/tree.ts` already treats these as roots rather than looping; the report should surface them explicitly rather than silently absorbing them.)
5. **Cards referencing a missing Deck** — `card.deckId` doesn't resolve to any existing deck.
6. **Roadmap nodes whose Deck would change identity** — every `RoadmapNode.deckId` where that deck is about to become a Collection (case 1), meaning the roadmap node's reference becomes semantically invalid post-split. This is the trigger for hiding/retiring the affected Roadmap UI per `itera-decisions.md` D11 — it does not trigger any change to Roadmap data itself.

Only after this report is produced and reviewed does a remedy for case 2 get designed — and only if case 2's count is nonzero. Whatever the remedy (an explicitly-named holding deck, manual reassignment prompted to the user, or something else decided at that point), **it is not optional to preserve every card** — zero cards may be lost or duplicated, full stop.

### 6.2 The migration itself

1. Every Deck with children (case 1 above) becomes a Collection.
2. Every leaf Deck (no children) stays a Deck; if its parent became a Collection, that's its `collectionId`; if it has no ancestor worth preserving, it goes to the root of "Unfiled."
3. Case 2 decks are handled per whatever the preflight report justified — implemented as its own reviewable step, not folded silently into step 1/2.
4. Multi-level Collection nesting is directly supported by reusing `src/domain/decks/tree.ts`'s existing cycle-safe algorithms against the new `Collection` type — no new algorithm needed, only a new type parameter.
5. Conforms to the §0 contract: dry run first, idempotent, reported, rollback via pre-migration export.

### 6.3 Roadmaps

Per `itera-decisions.md` D11: Roadmap data (the `Roadmap` type, both backends' repo methods, the Supabase `roadmaps` table, backup inclusion) is **not touched** by this migration. Only the UI route may be hidden, and only for roadmaps the preflight report (§6.1 item 6) actually flags as affected.

## 7. Backward compatibility / rollback strategy

- **Export a full backup before any migration in §4 or §6 touches production** (`Settings → Export JSON` — already exists, no new tooling needed).
- Ship schema changes as **additive** first (new tables/columns, old shape still readable) for a real observation period before removing old fields/tables. Applies to both §4 and §6.
- Because both backends store entities as opaque JSON blobs, adding fields is never destructive — only removing them is, and removal is always the last, separately-decided step (§4 step 6, cleanup).
- The immutable `ReviewLog`/`ReviewEvent` history is never touched by either the CardState or Collection/Deck migration (only `Card.scheduling`'s storage location and `Deck`'s shape change) — review history is not at risk even in a bad migration.

## 8. Supabase-specific process — versioned migration files, not ad hoc dashboard edits

Per `itera-decisions.md` D16. Every schema change ships as a new file under `supabase/migrations/`, e.g. `0001_card_states.sql`, `0002_collections.sql` — sequential, self-contained, checked into the repo. Each file includes:

```sql
-- 0001_card_states.sql
create table if not exists public.<table> (...);
create index if not exists ... on public.<table> (...);
alter table public.<table> enable row level security;
create policy "own rows" on public.<table> for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.<table> to authenticated;

-- Rollback:
--   drop table if exists public.<table>;
-- Safe only while nothing reads from this table yet (i.e. before the
-- corresponding read-cutover step ships).
```

Missing the final `grant` is the exact bug that caused a production 403 earlier in this project (Postgres denies the table before RLS runs) — every new migration file re-checks this. `supabase/schema.sql` may still be updated afterward as a consolidated reference, but the migration files, not dashboard edits, are the source of truth for what changed and when.

**Status: partially implemented, with one known gap.** `supabase/migrations/0001_card_states.sql` exists and follows the shape above. The later `cards_v2` table, however, was added **only** to `supabase/schema.sql` with no corresponding migration file — so a Supabase project created from `schema.sql` gets it, while one migrated file-by-file does not. Closing that gap (a `0002_cards_v2.sql` mirroring what `schema.sql` already declares) is the next action here.

Separately: both `card_states` and `cards_v2` are **unverified against a live database** — the project owner's Supabase project was deleted mid-development. They are written to the same standard as the rest of the schema, but flagged rather than assumed correct (`itera-decisions.md` D42).

## 9. Required test coverage

Minimum bar before the corresponding phase is considered complete:

- **Card payload migration (§1):** every old type migrates without throwing — **done**; migration is idempotent (calling `migrateCard` on the same input twice produces deep-equal output) — **done**, added during implementation; a real exported v1 backup migrates every card without throwing — **not written**; v1 backup auto-imports into a v2 app once `BACKUP_VERSION` bumps — **not written, blocked on the bump** (`BACKUP_VERSION` is still `1`); unknown future schema versions are still rejected safely (already true today for `parseBackup`'s `version > BACKUP_VERSION` check — needs a test once v2 exists to confirm it still holds).
- **CardState extraction (§4, Phase D):** backfill preserves scheduling state exactly (before/after equality per card, not just counts); due queries (`getDue()`, both backends) return the identical set of cards before and after read cutover on the same dataset; Review undo remains correct under dual-write.
- **Collection/Deck split (§6, Phase G):** entity and Card counts are conserved (report's before/after counts match reality); dry run output matches what `apply()` actually does; re-running `apply()` is a no-op (idempotence).
- **FSRS wrapper (`scheduler.ts`):** golden/invariant tests against known ts-fsrs reference values and multi-review sequences (repeated Again → relearning transition, long histories) — the current `scheduler.test.ts` covers single-review behavior only. Required before Phase D's parity verification step relies on the wrapper as a fully verified boundary, not just "reviewed with no defects found" (see the audit's corrected FSRS section).
- **Export/import round-trip:** a v2 export re-imports into a v2 app byte-for-byte equivalent (modulo `exportedAt`).
