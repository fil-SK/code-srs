import type { Millis, Rating, ReviewLog, SchedulingState } from '@/types'
import { buildReviewLog, previewStates, reviewState } from './scheduler'

// The boundary between Review UI and the FSRS scheduler (spec §9.5): UI never
// calls scheduler.ts directly, it goes through this service.
//
// Deliberately still shaped around SchedulingState (the same shape embedded
// in v1 Card.scheduling today), not a separate CardState — per
// docs/itera-migration-plan.md section 4, CardState extraction changes *where*
// this state is read from and written to (a CardState table instead of
// Card.scheduling), not what gets computed. Keeping this service's public
// shape stable across that migration means Review UI built against it now
// does not need to change when Phase D lands — only this file's internals do
// (a repository lookup/write added to `submit`, most likely).
//
// This service does not persist anything today. There is no CardV2
// repository yet (explicitly out of scope for this milestone — no schema
// changes), so callers (the design-preview routes) pass in whatever
// SchedulingState they have (a fresh baseline for a fixture) and get back the
// computed next state + log; nothing is written anywhere. Once CardV2 has a
// real backing store, `submit` starts persisting `after` and appending `log`,
// with no change to the function's signature.

export interface SubmitReviewCommand {
  cardId: string
  before: SchedulingState
  rating: Rating
  autoGraded: boolean
  durationMs: number
  now?: Millis
}

export interface SubmitReviewResult {
  after: SchedulingState
  log: ReviewLog
}

export interface ReviewService {
  // Next-state-per-grade, for labeling rating buttons with intervals.
  previewNextStates(
    before: SchedulingState,
    now?: Millis,
  ): Record<Rating, SchedulingState>
  submit(command: SubmitReviewCommand): Promise<SubmitReviewResult>
}

export const reviewService: ReviewService = {
  previewNextStates(before, now = Date.now()) {
    return previewStates(before, now)
  },

  async submit({ cardId, before, rating, autoGraded, durationMs, now = Date.now() }) {
    const after = reviewState(before, rating, now)
    const log = buildReviewLog({
      cardId,
      before,
      after,
      rating,
      autoGraded,
      durationMs,
      now,
    })
    return { after, log }
  },
}
