import type { Repository } from '@/data/repository'
import type { CardState } from '@/types/cardV2'
import { cardStateFromCard, cardStatesEqual } from '@/domain/scheduling/cardState'
import type { MigrationReport, MigrationRunner } from './runner'

async function plan(repo: Repository) {
  const cards = await repo.cards.getAll()
  const existing = await repo.cardStates.getAll()
  const existingById = new Map(existing.map((s) => [s.cardId, s]))

  const toWrite: CardState[] = []
  const changed: string[] = []
  const skipped: string[] = []
  let newRows = 0

  for (const card of cards) {
    const target = cardStateFromCard(card)
    const current = existingById.get(card.id)
    if (current && cardStatesEqual(current, target)) {
      skipped.push(card.id)
      continue
    }
    toWrite.push(target)
    changed.push(card.id)
    if (!current) newRows++
  }

  // A CardState row with no matching Card is unreachable going forward —
  // reported, not silently deleted (deletion is a separate, explicit call).
  const cardIds = new Set(cards.map((c) => c.id))
  const orphans = existing.filter((s) => !cardIds.has(s.cardId)).map((s) => s.cardId)

  const report: MigrationReport = {
    beforeCounts: { cards: cards.length, cardStates: existing.length },
    afterCounts: { cards: cards.length, cardStates: existing.length + newRows },
    changed,
    skipped,
    orphans,
    duplicates: [],
    warnings: [],
  }

  return { toWrite, report }
}

// Backfills one CardState row per existing Card (docs/itera-migration-plan.md
// §4 step 2). Purely additive — never touches Card.scheduling. Idempotent: a
// card whose CardState row already matches is `skipped`, not `changed`, so
// re-running apply() after a partial failure (or just to catch up newly
// created cards) is always safe.
export function createCardStateBackfill(repo: Repository): MigrationRunner {
  return {
    async dryRun() {
      const { report } = await plan(repo)
      return report
    },
    async apply() {
      const { toWrite, report } = await plan(repo)
      if (toWrite.length > 0) await repo.cardStates.bulkPut(toWrite)
      return report
    },
    rollbackInstructions() {
      return (
        'card_states is purely additive — Card.scheduling was never stopped ' +
        'or modified by this migration. To roll back, delete every row from ' +
        'the cardStates store (Dexie) / card_states table (Supabase), or ' +
        'simply leave them: nothing reads from CardState yet, so stale rows ' +
        'are inert until a future read-cutover step. No Settings → Export ' +
        'JSON restore is required.'
      )
    },
  }
}
