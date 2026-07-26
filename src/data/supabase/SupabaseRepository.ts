import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card, Deck, Draft, ID, Millis, ReviewLog, Roadmap } from '@/types'
import type { CardState, CardV2Record } from '@/types/cardV2'
import { searchableText } from '@/domain/search/searchableText'
import type {
  CardQuery,
  CardRepo,
  CardV2DueQuery,
  CardV2Query,
  CardV2Repo,
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

// Mirrors DexieRepository's cardV2SearchableText — CardV2Record's interaction
// union only has one member today (recall), so no exhaustive per-type switch.
function cardV2SearchableText(card: CardV2Record): string {
  const parts = [card.prompt.value, card.tip?.value, card.explanation?.value]
  if (card.interaction.type === 'recall') parts.push(card.interaction.answer.value)
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function createCardV2Repo(sb: SupabaseClient): CardV2Repo {
  const base = crud<CardV2Record>(sb, 'cards_v2')
  return {
    ...base,

    async getDue({ now, deckId, tags, limit }: CardV2DueQuery): Promise<CardV2Record[]> {
      const { data, error } = await sb
        .from('cards_v2')
        .select('data')
        .eq('suspended', false)
        .lte('due', now)
      if (error) throw error

      let cards = unwrap<CardV2Record>(data)
      if (deckId) cards = cards.filter((c) => c.deckId === deckId)
      if (tags?.length)
        cards = cards.filter((c) => tags.some((t) => c.tags.includes(t)))

      cards.sort((a, b) => a.scheduling.due - b.scheduling.due)
      return limit ? cards.slice(0, limit) : cards
    },

    async search({ text, deckId, tags, includeSuspended }: CardV2Query): Promise<CardV2Record[]> {
      const { data, error } = await sb.from('cards_v2').select('data')
      if (error) throw error
      let cards = unwrap<CardV2Record>(data)

      if (!includeSuspended) cards = cards.filter((c) => !c.suspended)
      if (deckId) cards = cards.filter((c) => c.deckId === deckId)
      if (tags?.length)
        cards = cards.filter((c) => tags.some((t) => c.tags.includes(t)))
      if (text) {
        const q = text.toLowerCase()
        cards = cards.filter((c) => cardV2SearchableText(c).includes(q))
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

// CardState's natural key is `cardId`, not `id` (see cardV2.ts), so the
// generic `crud<T extends {id: ID}>` helper above doesn't fit — bespoke,
// same as createCardRepo/createReviewRepo already are for their own reasons.
function createCardStateRepo(sb: SupabaseClient): CrudRepo<CardState> {
  return {
    async getAll() {
      const { data, error } = await sb.from('card_states').select('data')
      if (error) throw error
      return unwrap<CardState>(data)
    },
    async getById(cardId) {
      const { data, error } = await sb
        .from('card_states')
        .select('data')
        .eq('card_id', cardId)
        .maybeSingle()
      if (error) throw error
      return (data as Row<CardState> | null)?.data
    },
    async put(entity) {
      const { error } = await sb
        .from('card_states')
        .upsert({ card_id: entity.cardId, data: entity })
      if (error) throw error
    },
    async bulkPut(entities) {
      if (entities.length === 0) return
      const rows = entities.map((e) => ({ card_id: e.cardId, data: e }))
      const { error } = await sb.from('card_states').upsert(rows)
      if (error) throw error
    },
    async delete(cardId) {
      const { error } = await sb.from('card_states').delete().eq('card_id', cardId)
      if (error) throw error
    },
    async clear() {
      const { error } = await sb.from('card_states').delete().neq('card_id', '')
      if (error) throw error
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
  readonly roadmaps: CrudRepo<Roadmap>
  readonly cardStates: CrudRepo<CardState>
  readonly cardsV2: CardV2Repo

  constructor(sb: SupabaseClient = getSupabase()) {
    this.cards = createCardRepo(sb)
    this.decks = crud<Deck>(sb, 'decks')
    this.drafts = crud<Draft>(sb, 'drafts')
    this.reviews = createReviewRepo(sb)
    this.roadmaps = crud<Roadmap>(sb, 'roadmaps')
    this.cardStates = createCardStateRepo(sb)
    this.cardsV2 = createCardV2Repo(sb)
  }
}
