import type { CardQuery, DueQuery } from '@/data/repository'
import type { ID } from '@/types'

// Centralized query keys so invalidation stays consistent across hooks.
export const qk = {
  decks: ['decks'] as const,
  cards: ['cards'] as const,
  card: (id: ID) => ['cards', 'byId', id] as const,
  cardsDue: (query: DueQuery) => ['cards', 'due', query] as const,
  cardsSearch: (query: CardQuery) => ['cards', 'search', query] as const,
  reviewsForCard: (cardId: ID) => ['reviews', 'card', cardId] as const,
}
