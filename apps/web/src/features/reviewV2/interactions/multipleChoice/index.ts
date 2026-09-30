import { multipleChoiceBehavior } from '@fliptap/core'
import type { WebInteractionDefinition } from '../types'
import { MultipleChoiceView } from './MultipleChoiceView'

export const multipleChoiceDefinition: WebInteractionDefinition<'multiple_choice'> = {
  ...multipleChoiceBehavior,
  View: MultipleChoiceView,
}
