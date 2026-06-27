import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card, Deck, Draft, ID, Millis, ReviewLog } from '@/types'
import { searchableText } from '@/domain/search/searchableText'
import type {
  CardQuery,
  CardRepo,
  CrudRepo,
  DueQuery,
  Repository,
  ReviewRepo,
} from '../repository'
import { getSupabase } from './client'

// Every row stores the whole entity in a `data` jsonb column, so reads unwrap
// `row.data` and writes wrap `{ id, data: entity }`. user_id is filled by the
// table default (auth.uid()), and RLS scopes all queries to the current user.
type Row<T> = { data: T }

function unwrap<T>(rows: Row<T>[] | null): T[] {
  return (rows ?? []).map((r) => r.data)
}

// Generic CRUD over one table whose entities carry an inline `id`.
function crud<T extends { id: ID }>(
  sb: SupabaseClient,
  table: string,
): CrudRepo<T> {
  return {
    async getAll() {
      const { data, error } = await sb.from(table).select('data')
      if (error) throw error
      return unwrap<T>(data)
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
      const { data, error } = await sb
        .from('cards')
        .select('data')
        .eq('suspended', false)
        .lte('due', now)
      if (error) throw error

      let cards = unwrap<Card>(data)
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
      // Text/tag/type filtering happens in memory, identical to Dexie, so both
      // backends return the same results.
      const { data, error } = await sb.from('cards').select('data')
      if (error) throw error
      let cards = unwrap<Card>(data)

      if (!includeSuspended) cards = cards.filter((c) => !c.suspended)
      if (deckId) cards = cards.filter((c) => c.deckId === deckId)
      if (types?.length) cards = cards.filter((c) => types.includes(c.type))
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
      const { data, error } = await sb.from('review_logs').select('data')
      if (error) throw error
      return unwrap<ReviewLog>(data)
    },
    async clear() {
      const { error } = await sb.from('review_logs').delete().neq('id', '')
      if (error) throw error
    },
    async forCard(cardId: ID) {
      const { data, error } = await sb
        .from('review_logs')
        .select('data')
        .eq('card_id', cardId)
        .order('reviewed_at', { ascending: true })
      if (error) throw error
      return unwrap<ReviewLog>(data)
    },
    async range(from: Millis, to: Millis) {
      const { data, error } = await sb
        .from('review_logs')
        .select('data')
        .gte('reviewed_at', from)
        .lte('reviewed_at', to)
      if (error) throw error
      return unwrap<ReviewLog>(data)
    },
  }
}

// Supabase-backed implementation of the storage seam. Same surface as
// DexieRepository, so the rest of the app is unaware which one is active.
export class SupabaseRepository implements Repository {
  readonly cards: CardRepo
  readonly decks: CrudRepo<Deck>
  readonly drafts: CrudRepo<Draft>
  readonly reviews: ReviewRepo

  constructor(sb: SupabaseClient = getSupabase()) {
    this.cards = createCardRepo(sb)
    this.decks = crud<Deck>(sb, 'decks')
    this.drafts = crud<Draft>(sb, 'drafts')
    this.reviews = createReviewRepo(sb)
  }
}
