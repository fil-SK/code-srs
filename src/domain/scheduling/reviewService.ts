import type { Millis, Rating, ReviewLog, SchedulingState } from '@/types'
import { buildReviewLog, previewStates, reviewState } from './scheduler'

// The boundary between Review UI and the FSRS scheduler (spec §9.5): UI never
// calls scheduler.ts directly, it goes through this service.
//
// Shaped around SchedulingState, which every Card embeds directly. If
// scheduling is ever extracted into its own entity, that changes *where* this
// state is read from and written to, not what gets computed — so keeping this
// service's public shape stable means the Review UI built against it would not
// need to change, only this file's internals.
//
// `submit` computes and returns; it never persists. That separation is load
// bearing: the result it returns is immutable and is what gets written, so a
// failed write is retried by re-sending the same result rather than grading
// again. Persisting it is one storage operation (`Repository.commitReview`),
// reached through `usePersistReviewResult`. Nothing downstream recomputes FSRS.

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
