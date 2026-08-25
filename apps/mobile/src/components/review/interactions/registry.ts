import {
  matchingBehavior,
  multipleChoiceBehavior,
  orderingBehavior,
  recallBehavior,
  walkthroughBehavior,
  writeCodeBehavior,
  type InteractionType,
} from '@itera/core'

import { MatchingView } from './matching/MatchingView'
import { MultipleChoiceView } from './multipleChoice/MultipleChoiceView'
import { OrderingView } from './ordering/OrderingView'
import { RecallView } from './recall/RecallView'
import type { NativeInteractionDefinition } from './types'
import { WalkthroughView } from './walkthrough/WalkthroughView'
import { WriteCodeView } from './writeCode/WriteCodeView'

// The native interaction registry: one line per type, each spreading the shared
// behavior and adding this platform's View.
//
// Deliberately Partial rather than a total Record, exactly as web's is. A
// seventh interaction type added to core without a native View must fail loudly
// at runtime rather than rendering nothing - do not "improve" this into a
// compile-time guarantee, because the failure it produces is the point.

export const nativeInteractionRegistry: {
  [T in InteractionType]?: NativeInteractionDefinition<T>
} = {
  recall: { ...recallBehavior, View: RecallView },
  multiple_choice: { ...multipleChoiceBehavior, View: MultipleChoiceView },
  write_code: { ...writeCodeBehavior, View: WriteCodeView },
  ordering: { ...orderingBehavior, View: OrderingView },
  matching: { ...matchingBehavior, View: MatchingView },
  walkthrough: { ...walkthroughBehavior, View: WalkthroughView },
}

export function nativeInteractionFor<T extends InteractionType>(
  type: T,
): NativeInteractionDefinition<T> {
  const definition = nativeInteractionRegistry[type]
  if (!definition) {
    throw new Error(`No native Review View is registered for interaction type "${type}".`)
  }
  return definition
}
