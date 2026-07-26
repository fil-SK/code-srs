import type { Card } from '@/types'
import type { Repository } from '@/data/repository'
import type { CardV2Record } from '@/types/cardV2'
import { newId } from '@/lib/id'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { recallFormToRecord, type RecallEnvelope, type RecallFormState } from './recallForm'

export type SaveRecallCardTarget =
  | { kind: 'new' }
  | { kind: 'v2'; record: CardV2Record }
  | { kind: 'v1'; card: Card }

// The Recall editor's single save path, covering all three entry points: a
// brand-new card, editing an existing CardV2Record, or editing (and thereby
// migrating) a legacy v1 basic/codeReading/bugFinding card. The v1 case is
// the "legacy cutover": the new CardV2Record reuses the original card's
// id/createdAt/scheduling/suspended (so ReviewLog history for that id stays
// intact), then the superseded v1 Card row and its cardStates dual-write
// mirror are deleted — one persisted record per card, not two. Pulled out of
// the useSaveRecallCard hook so this logic is directly unit-testable against
// a repository without React Query plumbing.
export async function saveRecallCard(
  repo: Repository,
  form: RecallFormState,
  target: SaveRecallCardTarget,
  now: number = Date.now(),
): Promise<CardV2Record> {
  let envelope: RecallEnvelope

  if (target.kind === 'new') {
    envelope = {
      id: newId(),
      createdAt: now,
      suspended: false,
      scheduling: initialSchedulingState(now),
    }
  } else if (target.kind === 'v2') {
    envelope = {
      id: target.record.id,
      createdAt: target.record.createdAt,
      suspended: target.record.suspended,
      scheduling: target.record.scheduling,
      order: target.record.order,
    }
  } else {
    envelope = {
      id: target.card.id,
      createdAt: target.card.createdAt,
      suspended: target.card.suspended,
      scheduling: target.card.scheduling,
      order: target.card.order,
    }
  }

  const record = recallFormToRecord(form, envelope, now)
  await repo.cardsV2.put(record)

  if (target.kind === 'v1') {
    await repo.cards.delete(target.card.id)
    await repo.cardStates.delete(target.card.id)
  }

  return record
}
