import { matchingBehavior } from '@fliptap/core'
import type { WebInteractionDefinition } from '../types'
import { MatchingView } from './MatchingView'

export const matchingDefinition: WebInteractionDefinition<'matching'> = {
  ...matchingBehavior,
  View: MatchingView,
}
