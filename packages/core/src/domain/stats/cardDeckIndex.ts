import type { Card, ID } from '../../types'

// A `ReviewLog` records only a cardId, so every deck-scoped read resolves
// cardId -> deckId at query time. Callers build this once per render and pass
// it down, rather than each metric rebuilding its own.
//
// Deck attribution only. Card titles and type icons live behind feature
// modules that pull in lucide, and src/domain does not import from
// src/features, so callers that need a label resolve it themselves.
export function buildCardDeckMap(cards: Card[]): Map<ID, ID> {
  return new Map(cards.map((c) => [c.id, c.deckId]))
}
