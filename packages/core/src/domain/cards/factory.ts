import type { Card, Millis } from '../../types'
import { CARD_SCHEMA_VERSION } from '../../types/card'
import { newId } from '../../lib/id'
import { initialSchedulingState } from '../scheduling/state'

// The fields a caller supplies when creating a Card; the envelope
// (id, schemaVersion, timestamps, suspended, scheduling) is filled in here.
export type NewCardInput = Omit<
  Card,
  'id' | 'schemaVersion' | 'createdAt' | 'updatedAt' | 'suspended' | 'scheduling'
>

export function createCard(input: NewCardInput, now: Millis = Date.now()): Card {
  return {
    id: newId(),
    schemaVersion: CARD_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    suspended: false,
    scheduling: initialSchedulingState(now),
    ...input,
  }
}
