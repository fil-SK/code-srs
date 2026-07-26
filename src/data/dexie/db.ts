import Dexie, { type Table } from 'dexie'
import type { Card, Deck, Draft, ID, ReviewLog, Roadmap } from '@/types'
import type { CardState, CardV2Record } from '@/types/cardV2'

// IndexedDB schema. Indexes are chosen for the app's read patterns:
//   - cards by deck, type, tag (multi-entry), and due date (nested keypath)
//   - reviewLogs by card and time range (for history + stats)
// Booleans (e.g. card.suspended) are intentionally NOT indexed — IndexedDB keys
// can't be boolean, so suspension is filtered in memory.
export class AppDB extends Dexie {
  cards!: Table<Card, ID>
  decks!: Table<Deck, ID>
  drafts!: Table<Draft, ID>
  reviewLogs!: Table<ReviewLog, ID>
  roadmaps!: Table<Roadmap, ID>
  cardStates!: Table<CardState, ID>
  cardsV2!: Table<CardV2Record, ID>

  constructor() {
    super('code-srs')
    this.version(1).stores({
      cards: 'id, deckId, type, *tags, scheduling.due',
      decks: 'id, parentId, name',
      drafts: 'id, createdAt',
      reviewLogs: 'id, cardId, reviewedAt',
    })
    // v2 adds roadmaps (learning-order graphs over decks). Dexie carries the
    // existing stores forward; only the new table is declared.
    this.version(2).stores({
      roadmaps: 'id, title',
    })
    // v3 adds cardStates (Itera redesign Phase D — CardState extraction,
    // docs/itera-migration-plan.md §4): one row per Card, keyed by its own
    // `cardId` field (not a separate `id`), dual-written alongside
    // Card.scheduling. Purely additive — cards/decks/drafts/reviewLogs/
    // roadmaps are untouched and nothing reads from this store yet.
    this.version(3).stores({
      cardStates: 'cardId',
    })
    // v4 adds cardsV2 (Itera redesign Phase F — Create/Edit): real, persisted
    // CardV2 storage for cards authored/edited through the new Recall editor.
    // Independent of cardStates — embeds its own `scheduling`, not dual-
    // written there. Existing stores are untouched.
    this.version(4).stores({
      cardsV2: 'id, deckId, *tags, scheduling.due',
    })
  }
}

export const db = new AppDB()
