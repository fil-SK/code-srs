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
  View: MatchingView,
}
