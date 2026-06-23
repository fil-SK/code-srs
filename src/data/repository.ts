import type {
  Card,
  CardType,
  Deck,
  Draft,
  ID,
  Millis,
  ReviewLog,
} from '@/types'

// Generic create-read-update-delete contract. `put` upserts (create or replace),
// which maps cleanly onto both Dexie and Supabase. Timestamp bookkeeping lives in
// the service/hook layer, not here.
export interface CrudRepo<T> {
  getAll(): Promise<T[]>
  getById(id: ID): Promise<T | undefined>
  put(entity: T): Promise<void>
  bulkPut(entities: T[]): Promise<void> // used by import
  delete(id: ID): Promise<void>
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

export interface ReviewRepo {
  append(log: ReviewLog): Promise<void>
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
}
