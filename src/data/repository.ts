import type { Card, Deck, Draft, ID, InteractionType, Millis, ReviewLog, Roadmap } from '@/types'

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
  types?: InteractionType[]
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
  bulkPut(logs: ReviewLog[]): Promise<void> // used by import
  delete(id: ID): Promise<void> // used by review-session undo
  all(): Promise<ReviewLog[]> // used by export and stats
  clear(): Promise<void> // used by replace-import
  forCard(cardId: ID): Promise<ReviewLog[]>
  range(from: Millis, to: Millis): Promise<ReviewLog[]>
}

// The whole persisted workspace as one payload. Import is the only operation
// that writes every store at once, and it must do so as one unit.
export interface WorkspaceSnapshot {
  cards: Card[]
  decks: Deck[]
  drafts: Draft[]
  reviewLogs: ReviewLog[]
  roadmaps: Roadmap[]
}

// What a backend can promise for a write that spans more than one store.
//   'transactional' — the write either fully applies or leaves storage exactly
//                     as it was. Nothing partial is ever observable.
//   'best-effort'   — the write is a sequence that can stop halfway. A backend
//                     that says this must refuse a destructive multi-store
//                     write rather than clear storage it cannot restore.
export type WriteGuarantee = 'transactional' | 'best-effort'

// The same capability, named for the operation it has always described.
export type ImportGuarantee = WriteGuarantee

// One graded review, as the scheduler already computed it: the card carrying
// its advanced `scheduling`, and the immutable log describing that transition.
// The two are one fact about the learner's history, so they are one write.
export interface ReviewCommit {
  card: Card
  log: ReviewLog
}

// The exact inverse: the pre-grade card, restored verbatim, and the id of the
// log that grade produced.
export interface ReviewRevert {
  card: Card
  logId: ID
}

// The single seam the entire app depends on. Today it resolves to Dexie;
// later a SupabaseRepository implements the same surface with no UI changes.
export interface Repository {
  cards: CardRepo
  decks: CrudRepo<Deck>
  drafts: CrudRepo<Draft>
  reviews: ReviewRepo
  roadmaps: CrudRepo<Roadmap>

  // Whole-workspace import lives on the seam rather than being orchestrated
  // store-by-store by the caller: only the backend knows how (or whether) five
  // stores can be written as one unit. The import layer reports this guarantee
  // to the user instead of assuming one (audit P1-1).
  readonly importGuarantee: ImportGuarantee
  // Discard everything stored and write `snapshot` instead.
  replaceAll(snapshot: WorkspaceSnapshot): Promise<void>
  // Upsert `snapshot` over whatever is already stored.
  mergeAll(snapshot: WorkspaceSnapshot): Promise<void>

  // Grading writes two stores, and a card whose scheduling advanced without its
  // log is silently unreconstructible - every stat derives from the logs, so the
  // review becomes invisible while the card behaves as though it happened
  // (audit §10 item 6). Committing them separately can produce exactly that, in
  // either order, so the pair lives on the seam for the same reason import does:
  // only a backend knows whether two stores can be written as one unit.
  //
  // Both operations take an already-computed result. No backend recomputes FSRS,
  // and neither mints an id: a retry re-sends the identical ReviewCommit, which
  // is what makes retrying safe.
  readonly reviewGuarantee: WriteGuarantee
  commitReview(commit: ReviewCommit): Promise<void>
  revertReview(revert: ReviewRevert): Promise<void>
}
