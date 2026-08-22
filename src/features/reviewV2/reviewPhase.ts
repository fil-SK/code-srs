// Explicit Review state machine (spec §30.3), replacing the ad hoc
// booleans a v1 review flow uses. Five phases:
//
//   presenting    -> card shown, unanswered. Learner reveals (self-graded
//                    types) or builds a response and submits (auto-graded).
//   submitting    -> a response is being validated. Transient today (autoGrade
//                    is synchronous), but a real phase so an async validator
//                    could occupy it later without a shape change.
//   feedback      -> answer/result + explanation + rating controls are all
//                    visible together (matches spec §10.1's actual layout —
//                    rating is not a separate screen from the explanation).
//   rating        -> the learner has picked a grade, the result is computed,
//                    and it is being written (persistence is genuinely async,
//                    so this is a real, observable phase, not just decorative).
//   persistFailed -> the write rejected. A distinct state on purpose: a failure
//                    used to land in `transitioning` alongside success, which
//                    is how a failed grade could look like a finished one and
//                    strand the session (audit §10 item 5). The computed result
//                    is untouched and the same one is retried from here.
//   transitioning -> grade recorded, about to advance to the next card.
//
// Self-graded types (Recall) skip `submitting` entirely: REVEAL goes straight
// to `feedback` with `result: null`, since there is nothing to validate.

export interface ObjectiveResult {
  correct: boolean
  // Partial credit, 0..1, for interaction types where "correct" alone loses
  // information (Matching's per-relationship fraction, Walkthrough's
  // per-step fraction). Optional and unused by Recall/Multiple
  // Choice/Write Code, which stay binary. Added this milestone — see
  // docs/itera-decisions.md.
  score?: number
}

export type ReviewPhase =
  | { kind: 'presenting' }
  | { kind: 'submitting' }
  | { kind: 'feedback'; result: ObjectiveResult | null }
  | { kind: 'rating' }
  | { kind: 'persistFailed' }
  | { kind: 'transitioning' }

export type ReviewPhaseAction =
  | { type: 'REVEAL' } // self-graded: presenting -> feedback (result: null)
  | { type: 'SUBMIT_RESPONSE' } // auto-graded: presenting -> submitting
  | { type: 'RESPONSE_VALIDATED'; result: ObjectiveResult | null } // submitting -> feedback
  | { type: 'CHOOSE_RATING' } // feedback -> rating
  | { type: 'GRADED' } // rating -> transitioning (the write committed)
  | { type: 'PERSIST_FAILED' } // rating -> persistFailed (the write rejected)
  | { type: 'RETRY_PERSIST' } // persistFailed -> rating (same result, written again)
  | { type: 'RESET' } // -> presenting (new card)

export const initialReviewPhase: ReviewPhase = { kind: 'presenting' }

export function reviewPhaseReducer(
  state: ReviewPhase,
  action: ReviewPhaseAction,
): ReviewPhase {
  switch (action.type) {
    case 'REVEAL':
      return state.kind === 'presenting'
        ? { kind: 'feedback', result: null }
        : state
    case 'SUBMIT_RESPONSE':
      return state.kind === 'presenting' ? { kind: 'submitting' } : state
    case 'RESPONSE_VALIDATED':
      return state.kind === 'submitting'
        ? { kind: 'feedback', result: action.result }
        : state
    case 'CHOOSE_RATING':
      return state.kind === 'feedback' ? { kind: 'rating' } : state
    case 'GRADED':
      return state.kind === 'rating' ? { kind: 'transitioning' } : state
    case 'PERSIST_FAILED':
      return state.kind === 'rating' ? { kind: 'persistFailed' } : state
    // Guarded like every other transition, which is what makes a second retry
    // click while the first is still in flight a no-op rather than a second
    // write of the same result.
    case 'RETRY_PERSIST':
      return state.kind === 'persistFailed' ? { kind: 'rating' } : state
    case 'RESET':
      return initialReviewPhase
    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}
