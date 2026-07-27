import type { Card, ID } from '@/types'

export interface DeckMetrics {
  cardCount: number
  dueCount: number
  lastStudied?: number
  masteryFraction: number
}

const EMPTY: DeckMetrics = { cardCount: 0, dueCount: 0, masteryFraction: 0 }

// Per-deck metrics derived from real data — no separate "mastery"/"last
// studied" concept exists yet (see docs/itera-decisions.md), so
// masteryFraction is an honest proxy (share of non-suspended cards that have
// reached FSRS's "review" state) rather than a fabricated number. v2
// (CardV2Record) cards count toward cardCount (matching what the focused
// Deck page already shows) but not dueCount: /review's due queue is v1-only
// today (a pre-existing gap this milestone doesn't change — see
// ReviewPage.tsx's useDueCards), so dueCount stays honest about what
// "Study now" will actually pick up.
export function computeDeckMetrics(
  allCards: Card[],
  dueCards: Card[],
  v2CountByDeck: Map<ID, number>,
): Map<ID, DeckMetrics> {
  const byDeck = new Map<ID, DeckMetrics>()

  function entry(deckId: ID): DeckMetrics {
    let m = byDeck.get(deckId)
    if (!m) {
      m = { ...EMPTY }
      byDeck.set(deckId, m)
    }
    return m
  }

  const eligible = new Map<ID, number>()
  const matured = new Map<ID, number>()
  for (const card of allCards) {
    const m = entry(card.deckId)
    m.cardCount += 1
    if (card.scheduling.lastReview && (!m.lastStudied || card.scheduling.lastReview > m.lastStudied)) {
      m.lastStudied = card.scheduling.lastReview
    }
    if (!card.suspended) {
      eligible.set(card.deckId, (eligible.get(card.deckId) ?? 0) + 1)
      if (card.scheduling.state === 'review') {
        matured.set(card.deckId, (matured.get(card.deckId) ?? 0) + 1)
      }
    }
  }
  for (const card of dueCards) {
    entry(card.deckId).dueCount += 1
  }
  for (const [deckId, count] of v2CountByDeck) {
    entry(deckId).cardCount += count
  }
  for (const [deckId, m] of byDeck) {
    const n = eligible.get(deckId) ?? 0
    m.masteryFraction = n > 0 ? (matured.get(deckId) ?? 0) / n : 0
  }
  return byDeck
}

export function metricsFor(map: Map<ID, DeckMetrics>, deckId: ID): DeckMetrics {
  return map.get(deckId) ?? EMPTY
}
