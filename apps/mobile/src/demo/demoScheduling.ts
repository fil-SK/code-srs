import type { Card, Millis, SchedulingState, SchedulingStateKind } from '@itera/core'

import type { MobileCardStatus } from '@/src/types/library'

// How a demo card gets a real SchedulingState, and how the demo screens read
// one back.
//
// The demo cards used to carry two authored presentation booleans - `status`
// and `due` - which is fine for a static screenshot and useless the moment a
// card is actually reviewed: grading produces a new SchedulingState, and two
// hand-maintained flags beside it would immediately disagree with it. So the
// state is the record and both presentation values are derived from it. A card
// that is graded well stops being due because its `due` moved, not because
// anything set a flag.
//
// The seed is authored as an offset rather than an absolute instant. An
// absolute one would have to be anchored to DEMO_EPOCH (a fixed date in the
// past), which would make every card permanently overdue against the real clock
// and make "due in 3 days" impossible to express. Anchoring to the process's
// own start keeps the dataset deterministic per run - the whole point of the
// demo - while remaining correct against Date.now() during grading.

const DAY_MS = 86_400_000

/**
 * The authored half of a demo card's scheduling. Everything FSRS needs, minus
 * the absolute instant, which is resolved against the workspace's `now`.
 */
export interface DemoSchedulingSeed {
  state: SchedulingStateKind
  /** Days from `now`. Negative is overdue (and therefore in the queue). */
  dueOffsetDays: number
  reps: number
  lapses: number
  stability: number
  difficulty: number
  /** Days before `now`, or `null` for a card never reviewed. */
  lastReviewDaysAgo: number | null
}

export function resolveDemoScheduling(seed: DemoSchedulingSeed, now: Millis): SchedulingState {
  return {
    due: now + seed.dueOffsetDays * DAY_MS,
    stability: seed.stability,
    difficulty: seed.difficulty,
    elapsedDays: seed.lastReviewDaysAgo ?? 0,
    scheduledDays: seed.state === 'new' ? 0 : Math.max(0, Math.round(seed.stability)),
    reps: seed.reps,
    lapses: seed.lapses,
    learningSteps: seed.state === 'learning' || seed.state === 'relearning' ? 1 : 0,
    state: seed.state,
    lastReview: seed.lastReviewDaysAgo === null ? undefined : now - seed.lastReviewDaysAgo * DAY_MS,
  }
}

/**
 * The deck list's status label, derived from real scheduling.
 *
 * Relearning collapses into Learning because `MobileCardStatus` is deliberately
 * the three-state subset the mobile card list presents - see its declaration.
 */
export function demoCardStatus(card: Card): MobileCardStatus {
  switch (card.scheduling.state) {
    case 'new':
      return 'New'
    case 'review':
      return 'Review'
    case 'learning':
    case 'relearning':
      return 'Learning'
  }
}

/** Whether this card belongs in a session started at `now`. */
export function isDemoCardDue(card: Card, now: Millis): boolean {
  return !card.suspended && card.scheduling.due <= now
}
