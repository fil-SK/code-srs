import type { Card, Millis } from '@/types'
import { newId } from '@/lib/id'
import { initialSchedulingState } from '@/domain/scheduling/state'

// Plain Omit collapses a discriminated union (loses the type<->content link), so
// distribute over each variant to keep them correlated.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

// The fields a caller supplies when creating a card; the envelope (id,
// timestamps, suspended, scheduling) is filled in here.
export type NewCardInput = DistributiveOmit<
  Card,
  'id' | 'createdAt' | 'updatedAt' | 'suspended' | 'scheduling'
>

export function createCard(input: NewCardInput, now: Millis = Date.now()): Card {
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    suspended: false,
    scheduling: initialSchedulingState(now),
    ...input,
  } as Card
}
