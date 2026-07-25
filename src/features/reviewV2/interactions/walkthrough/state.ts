import type { ObjectiveResult } from '@/features/reviewV2/reviewPhase'
import type { WalkthroughStepAnswer } from '@/domain/grading/walkthrough'

// The whole multi-step walkthrough is one Card with one final rating (spec):
// this is the entire response object the shell threads through `response`/
// `setResponse`, tracked internally by this interaction alone. `stepIndex`
// is which step is currently displayed (freely navigable for review);
// `answers`/`results` only grow, keyed by step id once that step is first
// submitted - "first submitted objective result" is enforced by never
// overwriting an existing key (see WalkthroughView's submitStep).
export interface WalkthroughState {
  stepIndex: number
  answers: Record<string, WalkthroughStepAnswer>
  results: Record<string, ObjectiveResult | null>
}

export const initialWalkthroughState: WalkthroughState = {
  stepIndex: 0,
  answers: {},
  results: {},
}
