import {
  fsrs,
  Rating as FsrsRating,
  State,
  type Card as FsrsCard,
  type CardInput,
  type Grade,
} from 'ts-fsrs'
import type {
  Millis,
  Rating,
  ReviewLog,
  SchedulingState,
  SchedulingStateKind,
} from '@/types'
import { newId } from '@/lib/id'

// Default FSRS parameters include short-term learning steps (Again -> minutes),
// which is why we persist learningSteps in SchedulingState. Parameters become
// user-configurable in Settings (M6/M7) by passing generatorParameters here.
const scheduler = fsrs()

const KIND_TO_STATE: Record<SchedulingStateKind, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

const STATE_TO_KIND: Record<State, SchedulingStateKind> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

// Our Rating (1..4) shares values with FSRS Grade (Again..Easy); cast through.
function toGrade(rating: Rating): Grade {
  return rating as unknown as Grade
}

function toCardInput(s: SchedulingState): CardInput {
  return {
    due: s.due,
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: KIND_TO_STATE[s.state],
    last_review: s.lastReview ?? null,
  }
}

function fromCard(c: FsrsCard): SchedulingState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_TO_KIND[c.state],
    lastReview: c.last_review ? c.last_review.getTime() : undefined,
  }
}

// Apply a grade and return the card's next scheduling state.
export function reviewState(
  state: SchedulingState,
  rating: Rating,
  now: Millis = Date.now(),
): SchedulingState {
  const { card } = scheduler.next(toCardInput(state), now, toGrade(rating))
  return fromCard(card)
}

// The resulting state for each possible grade — used to label the grade buttons.
export function previewStates(
  state: SchedulingState,
  now: Millis = Date.now(),
): Record<Rating, SchedulingState> {
  const preview = scheduler.repeat(toCardInput(state), now)
  return {
    1: fromCard(preview[FsrsRating.Again].card),
    2: fromCard(preview[FsrsRating.Hard].card),
    3: fromCard(preview[FsrsRating.Good].card),
    4: fromCard(preview[FsrsRating.Easy].card),
  }
}

// Assemble a ReviewLog from the before/after states. before/after are computed
// here (not taken from the FSRS log) so the recorded deltas are exact.
export function buildReviewLog(params: {
  cardId: string
  before: SchedulingState
  after: SchedulingState
  rating: Rating
  autoGraded: boolean
  durationMs: number
  now: Millis
}): ReviewLog {
  const { cardId, before, after, rating, autoGraded, durationMs, now } = params
  return {
    id: newId(),
    cardId,
    reviewedAt: now,
    rating,
    autoGraded,
    durationMs,
    stabilityBefore: before.stability,
    stabilityAfter: after.stability,
    difficultyBefore: before.difficulty,
    difficultyAfter: after.difficulty,
    state: after.state,
  }
}
