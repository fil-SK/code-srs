import { walkthroughBehavior } from '@itera/core'
import type { WebInteractionDefinition } from '../types'
import { WalkthroughView } from './WalkthroughView'

export const walkthroughDefinition: WebInteractionDefinition<'walkthrough'> = {
  ...walkthroughBehavior,
  View: WalkthroughView,
}
