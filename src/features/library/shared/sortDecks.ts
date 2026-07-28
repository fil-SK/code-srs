import type { Deck } from '@/types'
import { metricsFor, type DeckMetrics } from '../deckMetrics'
import type { ID } from '@/types'

export type DeckSortKey = 'name' | 'due' | 'lastStudied' | 'cardCount'

// Shared by the root Library browser and a Collection's Decks section - both
// sort the same shape of leaf-deck list against the same metrics map.
export function sortDecks(decks: Deck[], sort: DeckSortKey, metrics: Map<ID, DeckMetrics>): Deck[] {
  const copy = [...decks]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case 'due':
      return copy.sort((a, b) => metricsFor(metrics, b.id).dueCount - metricsFor(metrics, a.id).dueCount)
    case 'lastStudied':
      return copy.sort(
        (a, b) => (metricsFor(metrics, b.id).lastStudied ?? 0) - (metricsFor(metrics, a.id).lastStudied ?? 0),
      )
    case 'cardCount':
      return copy.sort((a, b) => metricsFor(metrics, b.id).cardCount - metricsFor(metrics, a.id).cardCount)
  }
}
