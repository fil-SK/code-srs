import { recallBehavior } from '@itera/core'
import type { WebInteractionDefinition } from '../types'
import { RecallView } from './RecallView'

export const recallDefinition: WebInteractionDefinition<'recall'> = {
  ...recallBehavior,
  View: RecallView,
}
