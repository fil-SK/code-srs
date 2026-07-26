import type { CardQuery, CardV2Query, DueQuery } from '@/data/repository'
import type { ID } from '@/types'

// Centralized query keys so invalidation stays consistent across hooks.
export const qk = {
  decks: ['decks'] as const,
  cards: ['cards'] as const,
  card: (id: ID) => ['cards', 'byId', id] as const,
  cardsDue: (query: DueQuery) => ['cards', 'due', query] as const,
  cardsSearch: (query: CardQuery) => ['cards', 'search', query] as const,
  reviewsForCard: (cardId: ID) => ['reviews', 'card', cardId] as const,
  reviewsAll: ['reviews', 'all'] as const,
  drafts: ['drafts'] as const,
  draft: (id: ID) => ['drafts', 'byId', id] as const,
  roadmaps: ['roadmaps'] as const,
  roadmap: (id: ID) => ['roadmaps', 'byId', id] as const,
  cardStates: ['cardStates'] as const,
  cardsV2: ['cardsV2'] as const,
  cardV2: (id: ID) => ['cardsV2', 'byId', id] as const,
  cardsV2Search: (query: CardV2Query) => ['cardsV2', 'search', query] as const,
}
