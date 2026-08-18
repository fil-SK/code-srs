import type { Card, ID } from '@/types'
import type { CardV2Record } from '@/types/cardV2'

// A `ReviewLog` records only a cardId, so every deck-scoped read has to resolve
// cardId -> deckId at query time. That resolution must cover *both* card stores:
// editing a legacy v1 card in the Recall editor deletes its `cards` row and
// writes a `cardsV2` record under the same id (domain/cardsV2/saveRecallCard),
// so a v1-only map silently loses those cards' entire review history.
//
// Deck attribution only. Card titles and type icons live behind
// features/cards/cardTypeMeta and features/library/shared/rowVisuals, which
// pull in lucide - src/domain does not import from src/features, so callers
// that need a label resolve it themselves.
export function buildCardDeckMap(cards: Card[], cardsV2: CardV2Record[]): Map<ID, ID> {
  const map = new Map<ID, ID>()
  for (const c of cards) map.set(c.id, c.deckId)
  // v2 last: a migrated card exists in both stores only transiently, and the
  // v2 record is the newer truth if it ever does.
  for (const c of cardsV2) map.set(c.id, c.deckId)
  return map
}
