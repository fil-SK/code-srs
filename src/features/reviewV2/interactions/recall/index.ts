import type { InteractionDefinition } from '../types'
import { RecallView } from './RecallView'

export const recallDefinition: InteractionDefinition<'recall'> = {
  type: 'recall',
  interactive: false, // self-graded: reveal via Space/click, no response to validate
  View: RecallView,
}
