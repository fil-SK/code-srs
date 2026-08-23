import { gradeMultipleChoice } from '../domain/grading/multipleChoice'
import type { InteractionBehavior } from './types'

export const multipleChoiceBehavior = {
  type: 'multiple_choice',
  interactive: true,
  isResponseReady: (response) => Array.isArray(response) && response.length > 0,
  autoGrade: (interaction, response) =>
    gradeMultipleChoice(interaction, (response as string[] | undefined) ?? []),
} satisfies InteractionBehavior<'multiple_choice'>
