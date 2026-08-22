import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Card, Deck, Draft, ID, Millis, ReviewLog, Roadmap } from '../../types'
import { searchableText } from '../../domain/search/searchableText'
import type {
  CardQuery,
  CardRepo,
  CrudRepo,
  DueQuery,
  ImportGuarantee,
  Repository,
  ReviewCommit,
  ReviewRepo,
  ReviewRevert,
  WorkspaceSnapshot,
  WriteGuarantee,
} from '../repository'
import { ImportFailure } from '../../domain/io/importFailure'

// Every row stores the whole entity in a `data` jsonb column, so reads unwrap
// `row.data` and writes wrap `{ id, data: entity }`. user_id is filled by the
// table default (auth.uid()), and RLS scopes all queries to the current user.
type Row<T> = { data: T }

function unwrap<T>(rows: Row<T>[] | null): T[] {
  return (rows ?? []).map((r) => r.data)
}

// How many rows one request asks for. This is a round-trip/payload tradeoff and
// nothing else: the loop below stays correct for any value, and for a project
// row cap above or below it. It is not a product setting and is not exposed.
const PAGE_SIZE = 500

type Page<T> = {
  data: Row<T>[] | null
  count: number | null
  error: PostgrestError | null
}

// Read every row a query matches, not just the first response's worth.
//
// PostgREST caps each response at the project's API "Max rows" setting and says
// so only in the Content-Range header: an oversized select comes back as a 200
// carrying the first N rows and no error at all. One successful request is
// therefore not a complete read, which is how a cloud-mode backup could be
// exported already missing rows (audit P1-4).
//
// Termination deliberately never infers "last page" from "shorter than I asked
// for". A project whose cap is below PAGE_SIZE answers every request with a
// short page, so that inference is the same truncation bug in a new place.
// Instead the offset advances by however many rows actually arrived, and the
// loop stops on an empty page - always correct, and independent of any server
// metadata - or earlier when the exact count says the whole matching set is
// already in hand. That count also bounds the loop, so a backend behaving
// unexpectedly cannot spin forever and no arbitrary page limit is needed.
//
// `query` rebuilds the request per page rather than being handed a builder: a
// PostgrestFilterBuilder is a one-shot thenable, and the filters and the
// ordering belong to the caller.
async function selectAll<T>(
  query: (fromRow: number, toRow: number) => PromiseLike<Page<T>>,
): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const { data, count, error } = await query(rows.length, rows.length + PAGE_SIZE - 1)
    // A page that fails fails the whole read. Resolving with pages 1..N-1 would
    // be exactly the silent truncation this helper exists to prevent.
    if (error) throw error

    const page = unwrap<T>(data)
    rows.push(...page)
    if (page.length === 0) return rows
    if (count !== null && rows.length >= count) return rows
  }
}

// Generic CRUD over one table whose entities carry an inline `id`.
function crud<T extends { id: ID }>(
  sb: SupabaseClient,
  table: string,
): CrudRepo<T> {
  return {
    async getAll() {
      // Ordered by the primary key because range paging needs a deterministic
      // order; it also matches Dexie's toArray(), which yields primary-key
      // order.
      return selectAll<T>((fromRow, toRow) =>
        sb.from(table).select('data', { count: 'exact' }).order('id').range(fromRow, toRow),
      )
    },
    async getById(id) {
      const { data, error } = await sb
        .from(table)
        .select('data')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return (data as Row<T> | null)?.data
    },
    async put(entity) {
      const { error } = await sb
        .from(table)
        .upsert({ id: entity.id, data: entity })
      if (error) throw error
    },
    async bulkPut(entities) {
      if (entities.length === 0) return
      const rows = entities.map((e) => ({ id: e.id, data: e }))
      const { error } = await sb.from(table).upsert(rows)
      if (error) throw error
    },
    async delete(id) {
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) throw error
    },
    async clear() {
      // RLS limits this to the current user's rows. The filter is required by
      // PostgREST (it refuses an unconditional delete); id is never empty.
      const { error } = await sb.from(table).delete().neq('id', '')
      if (error) throw error
    },
  }
}

function createCardRepo(sb: SupabaseClient): CardRepo {
  const base = crud<Card>(sb, 'cards')
  return {
    ...base,

    async getDue({ now, deckId, tags, limit }: DueQuery): Promise<Card[]> {
      // Generated columns (due, suspended) do the heavy lifting in SQL; the
      // remaining predicates filter in memory, mirroring the Dexie backend.
      // `id` is the tie-breaker that makes paging over the non-unique `due`
      // column deterministic.
      let cards = await selectAll<Card>((fromRow, toRow) =>
        sb
          .from('cards')
          .select('data', { count: 'exact' })
          .eq('suspended', false)
          .lte('due', now)
          .order('due')
          .order('id')
          .range(fromRow, toRow),
      )

      if (deckId) cards = cards.filter((c) => c.deckId === deckId)
      if (tags?.length)
        cards = cards.filter((c) => tags.some((t) => c.tags.includes(t)))

      cards.sort((a, b) => a.scheduling.due - b.scheduling.due)
      // `limit` stays in memory rather than becoming a PostgREST limit: deck
      // and tag filtering still run client-side, so a server-side cut would
      // discard candidates those filters have never seen.
      return limit ? cards.slice(0, limit) : cards
    },

    async search({
      text,
      deckId,
      tags,
      types,
      includeSuspended,
    }: CardQuery): Promise<Card[]> {
      // Text/tag/type filtering happens in memory, identical to Dexie, so both
      // backends return the same results. That is also why the whole candidate
      // set has to be read first: a match can sit on any page.
      let cards = await selectAll<Card>((fromRow, toRow) =>
        sb.from('cards').select('data', { count: 'exact' }).order('id').range(fromRow, toRow),
      )

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

function createReviewRepo(sb: SupabaseClient): ReviewRepo {
  return {
    async append(log: ReviewLog) {
      const { error } = await sb
        .from('review_logs')
        .insert({ id: log.id, data: log })
      if (error) throw error
    },
    async bulkPut(logs: ReviewLog[]) {
      if (logs.length === 0) return
      const rows = logs.map((l) => ({ id: l.id, data: l }))
      const { error } = await sb.from('review_logs').upsert(rows)
      if (error) throw error
    },
    async delete(id: ID) {
      const { error } = await sb.from('review_logs').delete().eq('id', id)
      if (error) throw error
    },
    async all() {
      return selectAll<ReviewLog>((fromRow, toRow) =>
        sb
          .from('review_logs')
          .select('data', { count: 'exact' })
          .order('id')
          .range(fromRow, toRow),
      )
    },
    async clear() {
      const { error } = await sb.from('review_logs').delete().neq('id', '')
      if (error) throw error
    },
    async forCard(cardId: ID) {
      // reviewed_at ascending is this method's contract; `id` only breaks ties,
      // so two reviews sharing a timestamp cannot straddle a page boundary and
      // be dropped or repeated.
      return selectAll<ReviewLog>((fromRow, toRow) =>
        sb
          .from('review_logs')
          .select('data', { count: 'exact' })
          .eq('card_id', cardId)
          .order('reviewed_at', { ascending: true })
          .order('id')
          .range(fromRow, toRow),
      )
    },
    async range(from: Millis, to: Millis) {
      // Inclusive at both ends, matching Dexie's between(from, to, true, true).
      return selectAll<ReviewLog>((fromRow, toRow) =>
        sb
          .from('review_logs')
          .select('data', { count: 'exact' })
          .gte('reviewed_at', from)
          .lte('reviewed_at', to)
          .order('reviewed_at')
          .order('id')
          .range(fromRow, toRow),
      )
    },
  }
}

export class SupabaseRepository implements Repository {
  readonly cards: CardRepo
  readonly decks: CrudRepo<Deck>
  readonly drafts: CrudRepo<Draft>
  readonly reviews: ReviewRepo
  readonly roadmaps: CrudRepo<Roadmap>

  // PostgREST has no transaction that spans requests: every delete and every
  // upsert here is its own committed statement. A five-table clear followed by
  // five uploads is therefore a sequence that can stop halfway, and no amount
  // of client-side restore logic turns it into one unit - the restore can fail
  // too. This backend says so rather than pretending otherwise.
  readonly importGuarantee: ImportGuarantee = 'best-effort'

  // Grading is the exception, and only because a database-side function exists
  // for it. `commit_review` / `revert_review` (supabase/migrations/
  // 0004_review_commit_rpc.sql) each run their two statements inside PostgREST's
  // per-request transaction, so this is a real guarantee rather than a hopeful
  // sequence. The functions are SECURITY INVOKER, so RLS still decides which
  // rows the caller may touch.
  readonly reviewGuarantee: WriteGuarantee = 'transactional'

  private readonly sb: SupabaseClient

  // The client is injected, never constructed here. Building one means reading
  // configuration, and every platform reads it differently - Vite exposes
  // import.meta.env, Expo exposes process.env.EXPO_PUBLIC_*. Defaulting this
  // argument to a web factory is what used to pull import.meta into this file's
  // import graph and made the backend unusable off the browser. What the cloud
  // backend does is shared; how a client is built is the platform's business.
  constructor(sb: SupabaseClient) {
    this.sb = sb
    this.cards = createCardRepo(sb)
    this.decks = crud<Deck>(sb, 'decks')
    this.drafts = crud<Draft>(sb, 'drafts')
    this.reviews = createReviewRepo(sb)
    this.roadmaps = crud<Roadmap>(sb, 'roadmaps')
  }

  // Deliberately not `cards.put()` followed by `reviews.append()`: those are two
  // requests and therefore two commits, which is the inconsistency this whole
  // operation exists to prevent (audit §10 item 6). There is no client-side
  // fallback to that sequence - if the function is missing from the database the
  // call fails loudly rather than half-writing.
  async commitReview({ card, log }: ReviewCommit): Promise<void> {
    const { error } = await this.sb.rpc('commit_review', {
      p_card_id: card.id,
      p_card: card,
      p_log_id: log.id,
      p_log: log,
    })
    if (error) throw error
  }

  async revertReview({ card, logId }: ReviewRevert): Promise<void> {
    const { error } = await this.sb.rpc('revert_review', {
      p_card_id: card.id,
      p_card: card,
      p_log_id: logId,
    })
    if (error) throw error
  }

  // Refused, not attempted. Clearing the cloud workspace before uploads that
  // can fail is exactly the data loss audit P1-1 records; an all-or-nothing
  // cloud replace needs a database-side function (one transaction doing the
  // delete + insert for all five tables), which does not exist yet. Until it
  // does, Replace is unavailable in cloud mode and the UI hides it.
  async replaceAll(_snapshot: WorkspaceSnapshot): Promise<void> {
    throw new ImportFailure(
      'Replace is not available while your data is synced to the cloud, because the ' +
        'existing data cannot be restored if the upload fails partway. Use Merge instead. ' +
        'Nothing was changed.',
      'validation',
      true,
    )
  }

  // Additive and idempotent, so a failed merge leaves earlier upserts in place
  // but destroys nothing.
  async mergeAll(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.cards.bulkPut(snapshot.cards)
    await this.decks.bulkPut(snapshot.decks)
    await this.drafts.bulkPut(snapshot.drafts)
    await this.reviews.bulkPut(snapshot.reviewLogs)
    await this.roadmaps.bulkPut(snapshot.roadmaps)
  }
}
