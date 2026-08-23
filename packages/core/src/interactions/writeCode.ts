import { matchesAcceptedAnswer } from '../domain/grading/writeCode'
import type { InteractionBehavior } from './types'

export const writeCodeBehavior = {
  type: 'write_code',
  interactive: true,
  isResponseReady: (response) => typeof response === 'string' && response.trim().length > 0,
  autoGrade: (interaction, response) => ({
    correct: matchesAcceptedAnswer(
      (response as string | undefined) ?? '',
      interaction.acceptedAnswers,
      interaction.comparison,
    ),
  }),
} satisfies InteractionBehavior<'write_code'>
