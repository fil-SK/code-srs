import { gradeMatching, isMatchingResponseReady, type MatchingResponse } from '@/domain/grading/matching'
import type { InteractionDefinition } from '../types'
import { MatchingView } from './MatchingView'

export const matchingDefinition: InteractionDefinition<'matching'> = {
  type: 'matching',
  interactive: true,
  isResponseReady: (response, interaction) =>
    isMatchingResponseReady(interaction, (response as MatchingResponse | undefined) ?? {}),
  autoGrade: (interaction, response) => {
    const grade = gradeMatching(interaction, (response as MatchingResponse | undefined) ?? {})
    return { correct: grade.correct, score: grade.score }
  },
  // Three columns plus two gutters don't fit the default 42rem column - each
  // track ends up too narrow to hold a line of text without wrapping three
  // deep. A two-column board is exactly what that width was tuned for.
  widthFor: (interaction) => (interaction.columns.length > 2 ? 'wide' : 'default'),
  View: MatchingView,
}
