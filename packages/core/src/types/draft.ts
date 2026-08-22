import type { CodeBlock, ID, Millis } from './common'
import type { InteractionType } from './card'

// An inbox item captured quickly, before it becomes a fully-formed card.
// Converting a Draft produces a Card and then deletes the Draft.
export interface Draft {
  id: ID
  rawText: string
  code?: CodeBlock
  intendedType?: InteractionType
  intendedDeckId?: ID
  createdAt: Millis
}
