import type { ObjectiveResult } from '@itera/core'

// The native Review state machine.
//
// Web has its own (apps/web/src/features/reviewV2/reviewPhase.ts) and this is a
// second one on purpose, not by oversight: docs/architecture.md records that
// `ReviewPhase` and the interaction View props stay platform-side, because a
// phase is a statement about a screen's presentation and each platform owns its
// own. Everything the phases *coordinate* - readiness, grading, scheduling,
// ReviewLog construction - is shared and is never re-derived here.
//
// Four phases, one fewer than web:
//
//   presenting    -> card shown, unanswered. The learner reveals (self-graded
//                    types) or builds a response and submits (auto-graded).
//   submitting    -> a response is being validated. Transient today, because
//                    autoGrade is synchronous, but a real phase so an async
//                    validator could occupy it later without a shape change.
//   feedback      -> answer, objective result and the rating controls are all
//                    visible together. The learner has not rated yet.
//   transitioning -> a rating has been chosen and recorded; the session is
//                    about to advance.
//
// Web's fifth phase, `persistFailed`, is deliberately absent. It exists there
// because a Repository write can reject; demo review state is in-memory and
// synchronous, so there is no failure for the learner to retry and inventing
// one would be fabricated UX. The host keeps `onGraded` as an awaited seam,
// which is where a cloud session adds that phase and its retry when it has a
// real write to fail.
//
// Self-graded types (Recall) skip `submitting` entirely: REVEAL goes straight
// to `feedback` with `result: null`, since there is nothing to validate.

export type ReviewPhase =
  | { kind: 'presenting' }
  | { kind: 'submitting' }
  | { kind: 'feedback'; result: ObjectiveResult | null }
  | { kind: 'transitioning' }

export type ReviewPhaseAction =
  | { type: 'REVEAL' }
  | { type: 'SUBMIT_RESPONSE' }
  | { type: 'RESPONSE_VALIDATED'; result: ObjectiveResult | null }
  | { type: 'GRADED' }
  | { type: 'RESET' }

export const initialReviewPhase: ReviewPhase = { kind: 'presenting' }

export function reviewPhaseReducer(state: ReviewPhase, action: ReviewPhaseAction): ReviewPhase {
  switch (action.type) {
    case 'REVEAL':
      return state.kind === 'presenting' ? { kind: 'feedback', result: null } : state
    case 'SUBMIT_RESPONSE':
      return state.kind === 'presenting' ? { kind: 'submitting' } : state
    case 'RESPONSE_VALIDATED':
      return state.kind === 'submitting' ? { kind: 'feedback', result: action.result } : state
    // Guarded on `feedback`, which is what makes a second press of a rating
    // button - or a press of a different one - a no-op rather than a second
    // recorded review of the same card.
    case 'GRADED':
      return state.kind === 'feedback' ? { kind: 'transitioning' } : state
    case 'RESET':
      return initialReviewPhase
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
