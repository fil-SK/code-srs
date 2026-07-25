import type { InteractionType } from '@/types/cardV2'
import type { InteractionDefinition } from './types'
import { recallDefinition } from './recall'
import { multipleChoiceDefinition } from './multipleChoice'
import { writeCodeDefinition } from './writeCode'
import { orderingDefinition } from './ordering'
import { matchingDefinition } from './matching'
import { walkthroughDefinition } from './walkthrough'

// All six v2 interaction types are now registered. Still `Partial` (not a
// plain Record) so a future 7th type fails loudly here instead of silently
// rendering nothing, same rationale as when this only covered three types.
const registry: Partial<{ [T in InteractionType]: InteractionDefinition<T> }> = {
  recall: recallDefinition,
  multiple_choice: multipleChoiceDefinition,
  write_code: writeCodeDefinition,
  ordering: orderingDefinition,
  matching: matchingDefinition,
  walkthrough: walkthroughDefinition,
}

export function getInteractionDefinition<T extends InteractionType>(
  type: T,
): InteractionDefinition<T> {
  const def = registry[type]
  if (!def) {
    throw new Error(`No v2 interaction definition registered for "${type}".`)
  }
  return def as InteractionDefinition<T>
}
