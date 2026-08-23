import { describe, expect, it } from 'vitest'
import {
  initialReviewPhase,
  reviewPhaseReducer,
  type ReviewPhase,
} from './reviewPhase'

function run(actions: Parameters<typeof reviewPhaseReducer>[1][]): ReviewPhase {
  return actions.reduce(reviewPhaseReducer, initialReviewPhase)
}

describe('reviewPhaseReducer', () => {
  it('self-graded path: REVEAL goes straight to feedback with a null result', () => {
    expect(run([{ type: 'REVEAL' }])).toEqual({ kind: 'feedback', result: null })
  })

  it('auto-graded path: SUBMIT_RESPONSE -> submitting -> RESPONSE_VALIDATED -> feedback', () => {
    const afterSubmit = run([{ type: 'SUBMIT_RESPONSE' }])
    expect(afterSubmit).toEqual({ kind: 'submitting' })
    const afterValidated = reviewPhaseReducer(afterSubmit, {
      type: 'RESPONSE_VALIDATED',
      result: { correct: true },
    })
    expect(afterValidated).toEqual({ kind: 'feedback', result: { correct: true } })
  })

  it('feedback -> rating -> transitioning on CHOOSE_RATING then GRADED', () => {
    const feedback = run([{ type: 'REVEAL' }])
    const rating = reviewPhaseReducer(feedback, { type: 'CHOOSE_RATING' })
    expect(rating).toEqual({ kind: 'rating' })
    const transitioning = reviewPhaseReducer(rating, { type: 'GRADED' })
    expect(transitioning).toEqual({ kind: 'transitioning' })
  })

  it('RESET returns to presenting from any state', () => {
    const deep = run([
      { type: 'REVEAL' },
      { type: 'CHOOSE_RATING' },
      { type: 'GRADED' },
    ])
    expect(reviewPhaseReducer(deep, { type: 'RESET' })).toEqual(initialReviewPhase)
  })

  it('feedback -> rating -> persistFailed when the write rejects', () => {
    const rating = run([{ type: 'REVEAL' }, { type: 'CHOOSE_RATING' }])
    const failed = reviewPhaseReducer(rating, { type: 'PERSIST_FAILED' })
    expect(failed).toEqual({ kind: 'persistFailed' })
    // The whole point of the extra state: a failed write must not land where a
    // successful one does, or the session looks graded when nothing was saved.
    expect(failed).not.toEqual({ kind: 'transitioning' })
  })

  it('RETRY_PERSIST goes back to rating, and a committed retry reaches transitioning', () => {
    const failed = run([
      { type: 'REVEAL' },
      { type: 'CHOOSE_RATING' },
      { type: 'PERSIST_FAILED' },
    ])
    const retrying = reviewPhaseReducer(failed, { type: 'RETRY_PERSIST' })
    expect(retrying).toEqual({ kind: 'rating' })
    expect(reviewPhaseReducer(retrying, { type: 'GRADED' })).toEqual({
      kind: 'transitioning',
    })
  })

  it('a second RETRY_PERSIST while the retry is in flight is a no-op', () => {
    const retrying = run([
      { type: 'REVEAL' },
      { type: 'CHOOSE_RATING' },
      { type: 'PERSIST_FAILED' },
      { type: 'RETRY_PERSIST' },
    ])
    expect(reviewPhaseReducer(retrying, { type: 'RETRY_PERSIST' })).toEqual(retrying)
  })

  it('out-of-order actions are no-ops (guards against double-fire)', () => {
    // REVEAL while already in feedback must not throw or change state.
    const feedback = run([{ type: 'REVEAL' }])
    expect(reviewPhaseReducer(feedback, { type: 'REVEAL' })).toEqual(feedback)
    // RESPONSE_VALIDATED while still presenting (no SUBMIT_RESPONSE first).
    expect(
      reviewPhaseReducer(initialReviewPhase, {
        type: 'RESPONSE_VALIDATED',
        result: { correct: true },
      }),
    ).toEqual(initialReviewPhase)
    // GRADED while still in feedback (no CHOOSE_RATING first).
    expect(reviewPhaseReducer(feedback, { type: 'GRADED' })).toEqual(feedback)
    // PERSIST_FAILED once the write already committed: a late rejection must
    // not drag a finished card back into an error state.
    const transitioning = run([
      { type: 'REVEAL' },
      { type: 'CHOOSE_RATING' },
      { type: 'GRADED' },
    ])
    expect(reviewPhaseReducer(transitioning, { type: 'PERSIST_FAILED' })).toEqual(
      transitioning,
    )
    // RETRY_PERSIST with nothing to retry.
    expect(reviewPhaseReducer(feedback, { type: 'RETRY_PERSIST' })).toEqual(feedback)
  })
})
