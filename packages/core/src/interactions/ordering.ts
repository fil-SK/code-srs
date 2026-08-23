import type { ID } from '../types/common'
import { gradeOrdering, isOrderingResponseReady } from '../domain/grading/ordering'
import type { InteractionBehavior } from './types'

export const orderingBehavior = {
  type: 'ordering',
  interactive: true,
  isResponseReady: (response, interaction) =>
    isOrderingResponseReady(interaction, response as ID[] | undefined),
  autoGrade: (interaction, response) => {
    const grade = gradeOrdering(interaction, (response as ID[] | undefined) ?? [])
    return { correct: grade.correct, score: grade.score }
  },
} satisfies InteractionBehavior<'ordering'>
