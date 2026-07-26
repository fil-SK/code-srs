import type { Millis } from '@/types'
import type { CardV2Record } from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION } from '@/types/cardV2'
import { newId } from '@/lib/id'
import { initialSchedulingState } from '@/domain/scheduling/state'

// The fields a caller supplies when creating a CardV2Record; the envelope
// (id, schemaVersion, timestamps, suspended, scheduling) is filled in here —
// mirrors src/domain/cards/factory.ts's createCard for the v1 Card union.
export type NewCardV2Input = Omit<
  CardV2Record,
  'id' | 'schemaVersion' | 'createdAt' | 'updatedAt' | 'suspended' | 'scheduling'
>

export function createCardV2(
  input: NewCardV2Input,
  now: Millis = Date.now(),
): CardV2Record {
  return {
    id: newId(),
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    suspended: false,
    scheduling: initialSchedulingState(now),
    ...input,
  }
}
