import type { Repository } from '@/data/repository'
import type { Card } from '@/types/card'
import { newId } from '@/lib/id'
import { initialSchedulingState } from '@/domain/scheduling/state'
import {
  orderingFormToRecord,
  type OrderingEnvelope,
  type OrderingFormState,
} from './orderingForm'

export type SaveOrderingCardTarget =
  | { kind: 'new' }
  | { kind: 'existing'; record: Card }

// The Ordering editor's single save path, covering both entry points: a
// brand-new card, or editing an existing one (which reuses its
// id/createdAt/scheduling/suspended so ReviewLog history for that id stays
// intact). Pulled out of the hook so this logic is directly unit-testable
// against a repository without React Query plumbing.
export async function saveOrderingCard(
  repo: Repository,
  form: OrderingFormState,
  target: SaveOrderingCardTarget,
  now: number = Date.now(),
): Promise<Card> {
  let envelope: OrderingEnvelope

  if (target.kind === 'new') {
    envelope = {
      id: newId(),
      createdAt: now,
      suspended: false,
      scheduling: initialSchedulingState(now),
    }
  } else {
    envelope = {
      id: target.record.id,
      createdAt: target.record.createdAt,
      suspended: target.record.suspended,
      scheduling: target.record.scheduling,
      order: target.record.order,
    }
  }

  const record = orderingFormToRecord(form, envelope, now)
  await repo.cards.put(record)

  return record
}
