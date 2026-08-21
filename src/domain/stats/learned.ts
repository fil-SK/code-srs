import type { Card, ID, ReviewLog } from '@/types'

export interface LearnedSummary {
  learned: number
  total: number
}

// Canonical MVP definition: a learned card is a current, non-suspended card
// with at least one ReviewLog. It is a unique-card count and does not infer
// learning from the card's current FSRS state.
export function computeLearned(
  cards: Card[],
  logs: ReviewLog[],
  deckIds?: ReadonlySet<ID>,
): LearnedSummary {
  const reviewedCardIds = new Set(logs.map((log) => log.cardId))
  const active = cards.filter(
    (card) => !card.suspended && (!deckIds || deckIds.has(card.deckId)),
  )
  return {
    learned: active.filter((card) => reviewedCardIds.has(card.id)).length,
    total: active.length,
  }
}
