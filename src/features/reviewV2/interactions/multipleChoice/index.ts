import { gradeMultipleChoice } from '@/domain/grading/multipleChoice'
import type { InteractionDefinition } from '../types'
import { MultipleChoiceView } from './MultipleChoiceView'

export const multipleChoiceDefinition: InteractionDefinition<'multiple_choice'> = {
  type: 'multiple_choice',
  interactive: true,
  isResponseReady: (response) => Array.isArray(response) && response.length > 0,
  autoGrade: (interaction, response) =>
    gradeMultipleChoice(interaction, (response as string[] | undefined) ?? []),
  View: MultipleChoiceView,
}
