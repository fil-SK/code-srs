import type { InteractionBehavior } from './types'

// Self-graded: the learner reveals the answer and rates themselves, so there
// is no response to validate and nothing objective to grade. Deliberately no
// autoGrade/isResponseReady stub - "nothing to grade" is a real property of
// this interaction, not a gap to fill for structural symmetry.
export const recallBehavior = {
  type: 'recall',
  interactive: false,
} satisfies InteractionBehavior<'recall'>
