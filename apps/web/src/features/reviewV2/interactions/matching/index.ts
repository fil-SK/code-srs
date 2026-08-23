import { matchingBehavior } from '@itera/core'
import type { WebInteractionDefinition } from '../types'
import { MatchingView } from './MatchingView'

export const matchingDefinition: WebInteractionDefinition<'matching'> = {
  ...matchingBehavior,
  View: MatchingView,
}
