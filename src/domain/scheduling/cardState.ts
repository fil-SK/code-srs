import type { Card } from '@/types'
import type { CardState } from '@/types/cardV2'

// The single place Card.scheduling + Card.suspended gets reshaped into the
// v2 CardState row (src/types/cardV2.ts) — used by both the backfill
// migration (cardStateBackfill.ts) and every dual-write call site
// (src/hooks/useReview.ts, useCards.ts), so they can never compute a
// divergent shape. `suspended` lives on CardBase in v1, not inside
// SchedulingState — it's folded into CardState here because that's the v2
// type's own design (see cardV2.ts's CardState doc comment).
export function cardStateFromCard(card: Card): CardState {
  return {
    cardId: card.id,
    due: card.scheduling.due,
    state: card.scheduling.state,
    stability: card.scheduling.stability,
    difficulty: card.scheduling.difficulty,
    elapsedDays: card.scheduling.elapsedDays,
    scheduledDays: card.scheduling.scheduledDays,
    learningSteps: card.scheduling.learningSteps,
    reps: card.scheduling.reps,
    lapses: card.scheduling.lapses,
    suspended: card.suspended,
    lastReview: card.scheduling.lastReview,
  }
}

export function cardStatesEqual(a: CardState, b: CardState): boolean {
  return (
    a.due === b.due &&
    a.state === b.state &&
    a.stability === b.stability &&
    a.difficulty === b.difficulty &&
    a.elapsedDays === b.elapsedDays &&
    a.scheduledDays === b.scheduledDays &&
    a.learningSteps === b.learningSteps &&
    a.reps === b.reps &&
    a.lapses === b.lapses &&
    a.suspended === b.suspended &&
    a.lastReview === b.lastReview
  )
}
