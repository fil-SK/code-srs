import { orderingBehavior } from '@fliptap/core'
import type { WebInteractionDefinition } from '../types'
import { OrderingView } from './OrderingView'

export const orderingDefinition: WebInteractionDefinition<'ordering'> = {
  ...orderingBehavior,
  View: OrderingView,
}
