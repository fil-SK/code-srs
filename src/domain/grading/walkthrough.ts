import type { WalkthroughInteraction, WalkthroughStep } from '@/types/cardV2'
import type { ObjectiveResult } from '@/features/reviewV2/reviewPhase'
import { gradeMultipleChoice } from './multipleChoice'
import { matchesAcceptedAnswer } from './writeCode'

// A short-answer text comparison, distinct from Write Code's (which is
// case-sensitive by default, for code). Walkthrough's exact_input steps are
// prose/terms, not code, so case-insensitivity is the stronger default; still
// reuses matchesAcceptedAnswer rather than a second normalize implementation.
const EXACT_INPUT_COMPARISON = {
  trimOuterWhitespace: true,
  normalizeLineEndings: true,
  ignoreTrailingWhitespace: true,
  caseSensitive: false,
}

// Per-step response shapes, keyed by the step's own response.type so a given
// step only ever needs to interpret its own shape.
export type WalkthroughStepAnswer =
  | { type: 'recall'; revealed: true }
  | { type: 'multiple_choice'; selected: string[] }
  | { type: 'exact_input'; value: string }

// Recall steps are self-graded (reveal only, like the top-level Recall
// interaction) - there is nothing objective to check, so the result is null,
// same convention as the card-level Recall definition.
export function gradeWalkthroughStep(
  step: WalkthroughStep,
  answer: WalkthroughStepAnswer,
): ObjectiveResult | null {
  if (step.response.type === 'recall') return null

  if (step.response.type === 'multiple_choice' && answer.type === 'multiple_choice') {
    const grade = gradeMultipleChoice(
      { type: 'multiple_choice', selectionMode: step.response.selectionMode, randomizeOptions: false, options: step.response.options },
      answer.selected,
    )
    return { correct: grade.correct }
  }

  if (step.response.type === 'exact_input' && answer.type === 'exact_input') {
    const correct = step.response.acceptedAnswers.some((accepted) =>
      matchesAcceptedAnswer(answer.value, [accepted], EXACT_INPUT_COMPARISON),
    )
    return { correct }
  }

  return null
}

// Only steps with an objective response type (multiple_choice, exact_input)
// count toward the card-level result; a Walkthrough made entirely of recall
// steps has nothing to auto-grade, matching the top-level Recall interaction
// (self-graded, result: null) rather than reporting a vacuous "correct".
export function objectiveStepIds(interaction: WalkthroughInteraction): string[] {
  return interaction.steps
    .filter((s) => s.response.type !== 'recall')
    .map((s) => s.id)
}

export function aggregateWalkthroughResult(
  interaction: WalkthroughInteraction,
  stepResults: Record<string, ObjectiveResult | null>,
): ObjectiveResult | null {
  const ids = objectiveStepIds(interaction)
  if (ids.length === 0) return null
  const correctCount = ids.filter((id) => stepResults[id]?.correct).length
  return {
    correct: correctCount === ids.length,
    score: correctCount / ids.length,
  }
}
