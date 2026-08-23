import type { ObjectiveResult } from '../domain/grading/types'
import type { WalkthroughStepAnswer } from '../domain/grading/walkthrough'

// The whole multi-step walkthrough is one Card with one final rating (spec):
// this is the entire response object the review shell threads through
// `response`/`setResponse`, tracked internally by this interaction alone.
// `stepIndex` is which step is currently displayed (freely navigable for
// review); `answers`/`results` only grow, keyed by step id once that step is
// first submitted - "first submitted objective result" is enforced by never
// overwriting an existing key (see the web WalkthroughView's submitStep).
//
// It lives in core rather than beside the web View because walkthroughBehavior
// reads it: readiness ("every step answered") and the card-level aggregate are
// shared, so the state they read has to be shared too.
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
