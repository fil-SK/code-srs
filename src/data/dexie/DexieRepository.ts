import type { Table } from 'dexie'
import type { Card, Deck, Draft, ID, Millis, ReviewLog, Roadmap } from '@/types'
import { searchableText } from '@/domain/search/searchableText'
import type {
  CardQuery,
  CardRepo,
  CrudRepo,
  DueQuery,
  ImportGuarantee,
  Repository,
  ReviewRepo,
  WorkspaceSnapshot,
} from '../repository'
import { AppDB, db as defaultDb } from './db'

// Build a generic CRUD repo backed by a Dexie table. `put` upserts via the
// table's inline 'id' key; `bulkPut` powers import.
function crud<T>(table: Table<T, ID>): CrudRepo<T> {
  return {
    getAll: () => table.toArray(),
    getById: (id) => table.get(id),
    put: async (entity) => {
      await table.put(entity)
    },
    bulkPut: async (entities) => {
      await table.bulkPut(entities)
    },
    delete: async (id) => {
      await table.delete(id)
    },
    clear: async () => {
      await table.clear()
    },
  }
}

function createCardRepo(db: AppDB): CardRepo {
  return {
    ...crud(db.cards),

    async getDue({ now, deckId, tags, limit }: DueQuery): Promise<Card[]> {
      // Index narrows by due date; remaining predicates filter in memory
      // (fine at single-user scale, and IndexedDB can't AND across indexes).
      let cards = await db.cards
        .where('scheduling.due')
        .belowOrEqual(now)
        .toArray()

      cards = cards.filter((c) => !c.suspended)
      if (deckId) cards = cards.filter((c) => c.deckId === deckId)
      if (tags?.length)
        cards = cards.filter((c) => tags.some((t) => c.tags.includes(t)))

      cards.sort((a, b) => a.scheduling.due - b.scheduling.due)
      return limit ? cards.slice(0, limit) : cards
    },

    async search({
      text,
      deckId,
      tags,
      types,
      includeSuspended,
    }: CardQuery): Promise<Card[]> {
      let cards = await db.cards.toArray()

      if (!includeSuspended) cards = cards.filter((c) => !c.suspended)
      if (deckId) cards = cards.filter((c) => c.deckId === deckId)
      if (types?.length) cards = cards.filter((c) => types.includes(c.interaction.type))
      if (tags?.length)
        cards = cards.filter((c) => tags.some((t) => c.tags.includes(t)))
      if (text) {
        const q = text.toLowerCase()
        cards = cards.filter((c) => searchableText(c).includes(q))
      }

      return cards.sort((a, b) => b.updatedAt - a.updatedAt)
    },
  }
}

function createReviewRepo(db: AppDB): ReviewRepo {
  return {
    append: async (log: ReviewLog) => {
      await db.reviewLogs.add(log)
    },
    bulkPut: async (logs: ReviewLog[]) => {
      await db.reviewLogs.bulkPut(logs)
    },
    delete: async (id: ID) => {
      await db.reviewLogs.delete(id)
    },
    all: () => db.reviewLogs.toArray(),
    clear: async () => {
      await db.reviewLogs.clear()
    },
    forCard: (cardId: ID) =>
      db.reviewLogs.where('cardId').equals(cardId).sortBy('reviewedAt'),
    range: (from: Millis, to: Millis) =>
      db.reviewLogs.where('reviewedAt').between(from, to, true, true).toArray(),
  }
}

// IndexedDB-backed implementation of the storage seam.
export class DexieRepository implements Repository {
  readonly cards: CardRepo
  readonly decks: CrudRepo<Deck>
  readonly drafts: CrudRepo<Draft>
  readonly reviews: ReviewRepo
  readonly roadmaps: CrudRepo<Roadmap>

  // IndexedDB gives real all-or-nothing semantics across these five stores, so
  // this backend can promise them without any compensating restore logic.
  readonly importGuarantee: ImportGuarantee = 'transactional'

  private readonly db: AppDB

  constructor(db: AppDB = defaultDb) {
    this.db = db
    this.cards = createCardRepo(db)
    this.decks = crud(db.decks)
    this.drafts = crud(db.drafts)
    this.reviews = createReviewRepo(db)
    this.roadmaps = crud(db.roadmaps)
  }

  // One readwrite transaction over every store an import touches. If anything
  // inside rejects, Dexie aborts and IndexedDB rolls the whole scope back
  // itself - including the clears - so a failed replace cannot leave an empty
  // or half-written workspace. Snapshot-and-restore was rejected as the
  // alternative because the restore can fail too (audit P1-1).
  private workspaceWrite(scope: () => Promise<void>): Promise<void> {
    const { cards, decks, drafts, reviewLogs, roadmaps } = this.db
    return this.db.transaction('rw', cards, decks, drafts, reviewLogs, roadmaps, scope)
  }

  replaceAll(snapshot: WorkspaceSnapshot): Promise<void> {
    return this.workspaceWrite(async () => {
      // Sequential, not Promise.all: inside one transaction there is nothing to
      // gain from overlapping, and a single ordered chain makes the failing
      // operation unambiguous.
      await this.db.cards.clear()
      await this.db.decks.clear()
      await this.db.drafts.clear()
      await this.db.reviewLogs.clear()
      await this.db.roadmaps.clear()
      await this.writeSnapshot(snapshot)
    })
  }

  mergeAll(snapshot: WorkspaceSnapshot): Promise<void> {
    return this.workspaceWrite(() => this.writeSnapshot(snapshot))
  }

  private async writeSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.db.cards.bulkPut(snapshot.cards)
    await this.db.decks.bulkPut(snapshot.decks)
    await this.db.drafts.bulkPut(snapshot.drafts)
    await this.db.reviewLogs.bulkPut(snapshot.reviewLogs)
    await this.db.roadmaps.bulkPut(snapshot.roadmaps)
  }
}
