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
// reached FSRS's "review" state) rather than a fabricated number.
//
// Lives in src/domain/stats (not src/features/library, its original home)
// because Today's Continue Learning and Next Milestone need exactly these
// numbers, and src/domain may not import from src/features.
export function computeDeckMetrics(
  allCards: Card[],
  dueCards: Card[],
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
  for (const [deckId, m] of byDeck) {
    const n = eligible.get(deckId) ?? 0
    m.masteryFraction = n > 0 ? (matured.get(deckId) ?? 0) / n : 0
  }
  return byDeck
}

export function metricsFor(map: Map<ID, DeckMetrics>, deckId: ID): DeckMetrics {
  return map.get(deckId) ?? EMPTY
}

// Sums per-deck metrics already computed by computeDeckMetrics over a set of
// deck ids (a Collection's leaf descendants) — no separate query, just a
// reduction over data the page already has. masteryFraction is omitted: the
// Collection header intentionally doesn't show an aggregate mastery number
// (see LibraryCollectionView.tsx).
export interface CollectionMetrics {
  deckCount: number
  cardCount: number
  dueCount: number
  lastStudied?: number
}

export function aggregateMetrics(map: Map<ID, DeckMetrics>, deckIds: ID[]): CollectionMetrics {
  const agg: CollectionMetrics = { deckCount: deckIds.length, cardCount: 0, dueCount: 0 }
  for (const id of deckIds) {
    const m = metricsFor(map, id)
    agg.cardCount += m.cardCount
    agg.dueCount += m.dueCount
    if (m.lastStudied && (!agg.lastStudied || m.lastStudied > agg.lastStudied)) {
      agg.lastStudied = m.lastStudied
    }
  }
  return agg
}
