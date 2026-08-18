import Dexie, { type Table } from 'dexie'
import type { Card, Deck, Draft, ID, ReviewLog, Roadmap } from '@/types'

// IndexedDB schema. Indexes are chosen for the app's read patterns:
//   - cards by deck, tag (multi-entry), and due date (nested keypath)
//   - reviewLogs by card and time range (for history + stats)
// Booleans (e.g. card.suspended) are intentionally NOT indexed — IndexedDB keys
// can't be boolean, so suspension is filtered in memory.
//
// A single version(1) on purpose: the database was renamed from 'code-srs' to
// 'itera' when the v1/v2 card models converged, which discarded the prototype
// data rather than migrating it (see docs/itera-decisions.md). That reset let
// the old version(1)..version(4) ladder collapse into this one declaration.
// The next schema change adds version(2) as usual.
export class AppDB extends Dexie {
  cards!: Table<Card, ID>
  decks!: Table<Deck, ID>
  drafts!: Table<Draft, ID>
  reviewLogs!: Table<ReviewLog, ID>
  roadmaps!: Table<Roadmap, ID>

  constructor() {
    super('itera')
    this.version(1).stores({
      cards: 'id, deckId, *tags, scheduling.due',
      decks: 'id, parentId, name',
      drafts: 'id, createdAt',
      reviewLogs: 'id, cardId, reviewedAt',
      roadmaps: 'id, title',
    })
  }
}

export const db = new AppDB()

// One-time reclamation of the superseded prototype database. Its contents were
// deliberately discarded, not migrated; this only frees the storage they held.
// Fire-and-forget: failing to delete it is harmless, since nothing reads it.
void Dexie.delete('code-srs').catch(() => {})
