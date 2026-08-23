import type { InteractionType } from '@/types/card'
import type { WebInteractionDefinition } from './types'
import { recallDefinition } from './recall'
import { multipleChoiceDefinition } from './multipleChoice'
import { writeCodeDefinition } from './writeCode'
import { orderingDefinition } from './ordering'
import { matchingDefinition } from './matching'
import { walkthroughDefinition } from './walkthrough'

// All six v2 interaction types are now registered. Still `Partial` (not a
// plain Record) so a future 7th type fails loudly here instead of silently
// rendering nothing, same rationale as when this only covered three types.
//
// This is the web platform's registry: each entry is one shared behavior from
// @itera/core bound to this platform's View. A native app registers the same
// behaviors against native Views in its own registry - the lookup is per
// platform, the meaning of each interaction is not.
const registry: Partial<{ [T in InteractionType]: WebInteractionDefinition<T> }> = {
  recall: recallDefinition,
  multiple_choice: multipleChoiceDefinition,
  write_code: writeCodeDefinition,
  ordering: orderingDefinition,
  matching: matchingDefinition,
  walkthrough: walkthroughDefinition,
}

export function getInteractionDefinition<T extends InteractionType>(
  type: T,
): WebInteractionDefinition<T> {
  const def = registry[type]
  if (!def) {
    throw new Error(`No v2 interaction definition registered for "${type}".`)
  }
  return def as WebInteractionDefinition<T>
}
