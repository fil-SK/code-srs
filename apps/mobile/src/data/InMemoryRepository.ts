import {
  searchableText,
  type Card,
  type CardQuery,
  type CardRepo,
  type CrudRepo,
  type Deck,
  type Draft,
  type DueQuery,
  type ID,
  type ImportGuarantee,
  type Millis,
  type Repository,
  type ReviewCommit,
  type ReviewLog,
  type ReviewRepo,
  type ReviewRevert,
  type Roadmap,
  type WorkspaceSnapshot,
  type WriteGuarantee,
} from '@itera/core'

// The Demo runtime's storage backend: a complete, honest Repository held in
// plain JavaScript objects.
//
// It exists because Demo mode has to author decks and cards, and every shared
// hook that can do that reaches storage through this one contract. The
// alternative - a mobile-only mutation vocabulary beside the shared hooks -
// would have put a second way to write a Card on the platform least allowed to
// have one.
//
// Three things it deliberately is not:
//
//   * It is not persistence. There is no AsyncStorage, no SQLite and no
//     network. State lives for the life of the process and is gone on a full
//     app restart, which is the documented intent of Demo mode, not an
//     oversight.
//   * It is not a mock or a partial test double. Every member of the contract
//     is implemented, including the stores mobile has no UI for, because a
//     backend that throws on the half of the interface nobody happens to call
//     yet is a trap for whoever calls it next.
//   * It is not in @itera/core. Core owns the contract and deliberately owns no
//     way to build one (see data/registry.ts); a backend belongs to the
//     platform that composes it, and the marketing fixture that seeds this one
//     could never live in core at all.
//
// Filtering semantics are copied from DexieRepository rather than reinvented:
// both backends narrow in memory, both exclude suspended cards from getDue,
// both order due cards by due date, and both use core's one searchableText.
// Where the two could drift, this file follows Dexie.

function copy<T>(rows: Map<ID, T>): T[] {
  return [...rows.values()]
}

// Every store is the same shape, so one factory covers four of the five stores
// and most of the contract. Keyed by id, because put is an upsert.
function crud<T extends { id: ID }>(rows: Map<ID, T>): CrudRepo<T> {
  return {
    getAll: async () => copy(rows),
    getById: async (id) => rows.get(id),
    put: async (entity) => {
      rows.set(entity.id, entity)
    },
    bulkPut: async (entities) => {
      for (const entity of entities) rows.set(entity.id, entity)
    },
    delete: async (id) => {
      // One row, and only one row. Nothing cascades to child decks, cards,
      // review logs or drafts, because nothing cascades on Dexie or on Postgres
      // either - there is no foreign key and no deletion hook on either
      // backend. Whether a non-empty deck may be deleted is a product rule the
      // UI enforces; a backend that quietly deleted more than it was asked to
      // would be the divergence, not the safety net.
      rows.delete(id)
    },
    clear: async () => {
      rows.clear()
    },
  }
}

export class InMemoryRepository implements Repository {
  private readonly cardRows = new Map<ID, Card>()
  private readonly deckRows = new Map<ID, Deck>()
  private readonly draftRows = new Map<ID, Draft>()
  private readonly roadmapRows = new Map<ID, Roadmap>()
  private reviewRows: ReviewLog[] = []

  readonly cards: CardRepo
  readonly decks: CrudRepo<Deck>
  readonly drafts: CrudRepo<Draft>
  readonly reviews: ReviewRepo
  readonly roadmaps: CrudRepo<Roadmap>

  // A JavaScript object graph is swapped synchronously and cannot fail halfway,
  // so this backend can promise all-or-nothing without any compensating restore
  // logic. That is a stronger claim than the Supabase backend's best-effort
  // import, and it is true here for the same reason it is true of Dexie: the
  // mechanism really does give it.
  readonly importGuarantee: ImportGuarantee = 'transactional'
  readonly reviewGuarantee: WriteGuarantee = 'transactional'

  constructor(seed?: WorkspaceSnapshot) {
    this.cards = {
      ...crud(this.cardRows),
      getDue: async ({ now, deckId, tags, limit }: DueQuery) => {
        let cards = copy(this.cardRows).filter(
          (card) => !card.suspended && card.scheduling.due <= now,
        )
        if (deckId) cards = cards.filter((card) => card.deckId === deckId)
        if (tags?.length) cards = cards.filter((card) => tags.some((t) => card.tags.includes(t)))

        // Due date first, then id. Dexie needs no second key because IndexedDB
        // hands back an order of its own; a Map iteration order is stable too,
        // but only until a card is re-put, which grading does. The id tie-break
        // is what keeps a recorded demo reproducible across runs.
        cards.sort(
          (a, b) => a.scheduling.due - b.scheduling.due || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        )
        return limit ? cards.slice(0, limit) : cards
      },
      search: async ({ text, deckId, tags, types, includeSuspended }: CardQuery) => {
        let cards = copy(this.cardRows)
        if (!includeSuspended) cards = cards.filter((card) => !card.suspended)
        if (deckId) cards = cards.filter((card) => card.deckId === deckId)
        if (types?.length) cards = cards.filter((card) => types.includes(card.interaction.type))
        if (tags?.length) cards = cards.filter((card) => tags.some((t) => card.tags.includes(t)))
        if (text) {
          const q = text.toLowerCase()
          cards = cards.filter((card) => searchableText(card).includes(q))
        }
        return cards.sort((a, b) => b.updatedAt - a.updatedAt)
      },
    }

    this.decks = crud(this.deckRows)
    this.drafts = crud(this.draftRows)
    this.roadmaps = crud(this.roadmapRows)

    this.reviews = {
      append: async (log) => {
        this.reviewRows = [...this.reviewRows, log]
      },
      bulkPut: async (logs) => {
        const incoming = new Map(logs.map((log) => [log.id, log]))
        const existing = new Set(this.reviewRows.map((log) => log.id))
        this.reviewRows = [
          ...this.reviewRows.map((log) => incoming.get(log.id) ?? log),
          ...logs.filter((log) => !existing.has(log.id)),
        ]
      },
      delete: async (id) => {
        this.reviewRows = this.reviewRows.filter((log) => log.id !== id)
      },
      all: async () => [...this.reviewRows],
      clear: async () => {
        this.reviewRows = []
      },
      forCard: async (cardId) =>
        this.reviewRows
          .filter((log) => log.cardId === cardId)
          .sort((a, b) => a.reviewedAt - b.reviewedAt),
      range: async (from: Millis, to: Millis) =>
        this.reviewRows.filter((log) => log.reviewedAt >= from && log.reviewedAt <= to),
    }

    if (seed) this.resetTo(seed)
  }

  async replaceAll(snapshot: WorkspaceSnapshot): Promise<void> {
    this.resetTo(snapshot)
  }

  async mergeAll(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.cards.bulkPut(snapshot.cards)
    await this.decks.bulkPut(snapshot.decks)
    await this.drafts.bulkPut(snapshot.drafts)
    await this.roadmaps.bulkPut(snapshot.roadmaps)
    await this.reviews.bulkPut(snapshot.reviewLogs)
  }

  // Both stores move together or neither does. There is nothing to roll back,
  // because nothing is written until both writes are known to be safe.
  //
  // Dexie uses add for the log and lets a duplicate id abort the transaction,
  // which surfaces a caller bug loudly. This backend is idempotent on the log
  // id instead, and that is a deliberate difference rather than an oversight:
  // the demo Review session has no persist-failure surface to show a rejection
  // in (a demo write cannot fail, which is exactly why that surface was never
  // built), so a rejected commit would surface as an unhandled rejection.
  // Duplicate-grade protection has been an established demo semantic since the
  // workspace owned this write, and it is preserved here rather than dropped in
  // the move.
  async commitReview({ card, log }: ReviewCommit): Promise<void> {
    if (this.reviewRows.some((existing) => existing.id === log.id)) return
    this.cardRows.set(card.id, card)
    this.reviewRows = [...this.reviewRows, log]
  }

  // The exact inverse: the card is restored verbatim from the caller's recorded
  // pre-grade copy rather than by running the scheduler backwards, because FSRS
  // is not invertible.
  async revertReview({ card, logId }: ReviewRevert): Promise<void> {
    if (!this.reviewRows.some((existing) => existing.id === logId)) return
    this.cardRows.set(card.id, card)
    this.reviewRows = this.reviewRows.filter((log) => log.id !== logId)
  }

  /**
   * Discard everything and load `snapshot`, synchronously.
   *
   * Beyond the `Repository` contract on purpose. `replaceAll` is the contract's
   * async form and delegates here; Reset Demo wants the synchronous one so the
   * repository, the query cache and the demo provider can be returned to the
   * seed inside one React event rather than across an await.
   */
  resetTo(snapshot: WorkspaceSnapshot): void {
    this.cardRows.clear()
    this.deckRows.clear()
    this.draftRows.clear()
    this.roadmapRows.clear()
    for (const card of snapshot.cards) this.cardRows.set(card.id, card)
    for (const deck of snapshot.decks) this.deckRows.set(deck.id, deck)
    for (const draft of snapshot.drafts) this.draftRows.set(draft.id, draft)
    for (const roadmap of snapshot.roadmaps) this.roadmapRows.set(roadmap.id, roadmap)
    this.reviewRows = [...snapshot.reviewLogs]
  }
}
