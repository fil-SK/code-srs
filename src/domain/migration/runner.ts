// Shared contract every migration except card-payload adaptation (§1) must
// conform to — see docs/itera-migration-plan.md §0. Card-payload adaptation
// (migrateCard) is the one exception, allowed to run lazily on read because
// it's a pure content reshape that never changes where an entity lives or
// what references it. Anything that changes storage location or entity
// identity (CardState extraction, the Collection/Deck split) goes through
// this instead: dry-run-able, idempotent, deterministic, and reportable.

export interface MigrationReport {
  beforeCounts: Record<string, number>
  afterCounts: Record<string, number>
  changed: string[] // ids actually touched (empty on a dry run)
  skipped: string[] // ids already in the target shape — proves idempotence
  orphans: string[] // ids that would be/were left unreachable
  duplicates: string[] // ids that would be/were duplicated
  warnings: string[] // ambiguous cases the migration had to make a call on
}

export interface MigrationRunner {
  // No writes. Deterministic: same input data always produces the same report.
  dryRun(): Promise<MigrationReport>
  // Performs the writes described by dryRun(). Idempotent: running apply()
  // twice in a row produces the same end state, and the second run's report
  // shows everything as `skipped`, nothing as `changed`.
  apply(): Promise<MigrationReport>
  // Human-readable instructions for restoring pre-migration state.
  rollbackInstructions(): string
}
