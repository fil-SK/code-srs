import type {
  Card,
  CardType,
  Deck,
  Draft,
  ID,
  Millis,
  ReviewLog,
  Roadmap,
} from '@/types'
import type { CardState, CardV2Record } from '@/types/cardV2'

// Generic create-read-update-delete contract. `put` upserts (create or replace),
// which maps cleanly onto both Dexie and Supabase. Timestamp bookkeeping lives in
// the service/hook layer, not here.
export interface CrudRepo<T> {
  getAll(): Promise<T[]>
  getById(id: ID): Promise<T | undefined>
  put(entity: T): Promise<void>
  bulkPut(entities: T[]): Promise<void> // used by import
  delete(id: ID): Promise<void>
  clear(): Promise<void> // used by replace-import
}

export interface CardQuery {
  text?: string
  deckId?: ID
  tags?: string[]
  types?: CardType[]
  includeSuspended?: boolean
}

export interface DueQuery {
  now: Millis
  deckId?: ID
  tags?: string[]
  limit?: number
}

export interface CardRepo extends CrudRepo<Card> {
  getDue(query: DueQuery): Promise<Card[]>
  search(query: CardQuery): Promise<Card[]>
}

export interface CardV2Query {
  text?: string
  deckId?: ID
  tags?: string[]
  includeSuspended?: boolean
}

export interface CardV2DueQuery {
  now: Millis
  deckId?: ID
  tags?: string[]
  limit?: number
}

// CardV2Record's own repo (Itera Phase F): a real, persisted store,
// independent of the CardState dual-write below — new CardV2-authored cards
// carry their own embedded scheduling rather than reading/writing cardStates.
export interface CardV2Repo extends CrudRepo<CardV2Record> {
  getDue(query: CardV2DueQuery): Promise<CardV2Record[]>
  search(query: CardV2Query): Promise<CardV2Record[]>
}

export interface ReviewRepo {
  append(log: ReviewLog): Promise<void>
  bulkPut(logs: ReviewLog[]): Promise<void> // used by import
  delete(id: ID): Promise<void> // used by review-session undo
  all(): Promise<ReviewLog[]> // used by export and stats
  clear(): Promise<void> // used by replace-import
  forCard(cardId: ID): Promise<ReviewLog[]>
  range(from: Millis, to: Millis): Promise<ReviewLog[]>
}

// The single seam the entire app depends on. Today it resolves to Dexie;
// later a SupabaseRepository implements the same surface with no UI changes.
export interface Repository {
  cards: CardRepo
  decks: CrudRepo<Deck>
  drafts: CrudRepo<Draft>
  reviews: ReviewRepo
  roadmaps: CrudRepo<Roadmap>
  // Itera redesign Phase D (docs/itera-migration-plan.md §4): additive,
  // dual-written alongside Card.scheduling — CrudRepo's `id` parameter is
  // CardState's `cardId` (its natural key; the type has no separate `id`).
  // Nothing reads from this yet — Card.scheduling stays the source of truth
  // until a later, separate read-cutover step.
  cardStates: CrudRepo<CardState>
  // Itera Phase F: real, persisted CardV2 storage for cards authored/edited
  // through the new Recall editor. Independent of cardStates above.
  cardsV2: CardV2Repo
}
