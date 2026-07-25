import { matchesAcceptedAnswer } from '@/domain/grading/writeCode'
import type { InteractionDefinition } from '../types'
import { WriteCodeView } from './WriteCodeView'

export const writeCodeDefinition: InteractionDefinition<'write_code'> = {
  type: 'write_code',
  interactive: true,
  isResponseReady: (response) =>
    typeof response === 'string' && response.trim().length > 0,
  autoGrade: (interaction, response) => ({
    correct: matchesAcceptedAnswer(
      (response as string | undefined) ?? '',
      interaction.acceptedAnswers,
      interaction.comparison,
    ),
  }),
  View: WriteCodeView,
}
