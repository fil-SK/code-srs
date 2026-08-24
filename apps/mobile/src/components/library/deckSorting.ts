import { type Deck, type DeckMetrics, type DeckSortKey, type ID, sortDecks } from '@itera/core'

import type { MobileLibraryDeckViewModel } from '@/src/types/library'

// The one place a mobile deck list is filtered and ordered.
//
// The ordering itself is not implemented here. `sortDecks` in @itera/core is
// what web's Library uses, and it is called verbatim, so all four keys mean
// exactly the same thing on both platforms and there is no second comparator to
// keep in step. This module only projects the presentation rows into the shapes
// that function takes and puts the rows back in the order it returns.
//
// The projection is a real map rather than a cast: `sortDecks` is declared over
// `Deck`, a presentation row is not one, and pretending otherwise would hide the
// day a real `Deck` field starts mattering to the sort.
//
// Filtering matches web's Library exactly - due-only, then case-insensitive
// search over name and description, then sort.

function sortableDeck(deck: MobileLibraryDeckViewModel): Deck {
  // Only `id` and `name` are read by any comparator; every other input comes
  // from the metrics map below.
  return { id: deck.id, name: deck.name, createdAt: 0, updatedAt: 0 }
}

export function metricsFromDeckViewModels(
  decks: MobileLibraryDeckViewModel[],
): Map<ID, DeckMetrics> {
  const metrics = new Map<ID, DeckMetrics>()
  for (const deck of decks) {
    metrics.set(deck.id, {
      cardCount: deck.cardCount,
      dueCount: deck.dueCount,
      lastStudied: deck.lastStudiedAt,
      masteryFraction: deck.progressPercent / 100,
    })
  }
  return metrics
}

export function filterAndSortDeckViewModels(
  decks: MobileLibraryDeckViewModel[],
  options: { query?: string; dueOnly?: boolean; sort: DeckSortKey },
): MobileLibraryDeckViewModel[] {
  const normalizedQuery = (options.query ?? '').trim().toLocaleLowerCase()

  const filtered = decks.filter((deck) => {
    if (options.dueOnly && deck.dueCount === 0) return false
    if (!normalizedQuery) return true
    return `${deck.name} ${deck.description}`.toLocaleLowerCase().includes(normalizedQuery)
  })

  const metrics = metricsFromDeckViewModels(filtered)
  const byId = new Map(filtered.map((deck) => [deck.id, deck]))

  return sortDecks(filtered.map(sortableDeck), options.sort, metrics)
    .map((deck) => byId.get(deck.id))
    .filter((deck): deck is MobileLibraryDeckViewModel => deck !== undefined)
}

/**
 * The four options, with web's labels. "Due soon" is web's wording for
 * most-due-first rather than next-due-date; kept so the two platforms do not
 * describe the same ordering differently.
 */
export const DECK_SORT_OPTIONS: { value: DeckSortKey; label: string }[] = [
  { value: 'lastStudied', label: 'Last studied' },
  { value: 'name', label: 'Name' },
  { value: 'due', label: 'Due soon' },
  { value: 'cardCount', label: 'Card count' },
]

export function deckSortLabel(sort: DeckSortKey): string {
  return DECK_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Last studied'
}
