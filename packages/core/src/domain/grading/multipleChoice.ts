import type { MultipleChoiceInteraction } from '../../types/card'

export interface MultipleChoiceGrade {
  correct: boolean
  selectedCorrect: string[] // selected option ids that were right
  selectedIncorrect: string[] // selected option ids that were wrong
  missedCorrect: string[] // correct option ids the learner did not select
}

// Exact-set grading: correct only if every correct option was selected and no
// incorrect option was. Shared by autoGrade and the feedback view (so the
// three highlighted categories in the UI are always derived from the same
// logic that decided pass/fail, not recomputed separately and liable to
// drift).
export function gradeMultipleChoice(
  interaction: MultipleChoiceInteraction,
  selectedIds: string[],
): MultipleChoiceGrade {
  const selected = new Set(selectedIds)
  const selectedCorrect: string[] = []
  const selectedIncorrect: string[] = []
  const missedCorrect: string[] = []

  for (const option of interaction.options) {
    const isSelected = selected.has(option.id)
    if (option.correct) {
      if (isSelected) selectedCorrect.push(option.id)
      else missedCorrect.push(option.id)
    } else if (isSelected) {
      selectedIncorrect.push(option.id)
    }
  }

  return {
    correct: selectedIncorrect.length === 0 && missedCorrect.length === 0,
    selectedCorrect,
    selectedIncorrect,
    missedCorrect,
  }
}
