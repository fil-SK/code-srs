import type { Card } from '@/types'
import type { Repository } from '@/data/repository'
import type { CardV2Record } from '@/types/cardV2'
import { newId } from '@/lib/id'
import { initialSchedulingState } from '@/domain/scheduling/state'
import {
  matchingFormToRecord,
  type MatchingEnvelope,
  type MatchingFormState,
} from './matchingForm'

export type SaveMatchingCardTarget =
  | { kind: 'new' }
  | { kind: 'v2'; record: CardV2Record }
  | { kind: 'v1'; card: Card }

// The Matching editor's single save path — mirrors saveOrderingCard.ts
// exactly: a brand-new card, editing an existing CardV2Record, or editing
// (and thereby migrating) a legacy v1 matching card. The v1 case reuses the
// original card's id/createdAt/scheduling/suspended, then deletes the
// superseded v1 Card row and its cardStates dual-write mirror — one
// persisted record per card.
export async function saveMatchingCard(
  repo: Repository,
  form: MatchingFormState,
  target: SaveMatchingCardTarget,
  now: number = Date.now(),
): Promise<CardV2Record> {
  let envelope: MatchingEnvelope

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

  const record = matchingFormToRecord(form, envelope, now)
  await repo.cardsV2.put(record)

  if (target.kind === 'v1') {
    await repo.cards.delete(target.card.id)
    await repo.cardStates.delete(target.card.id)
  }

  return record
}
