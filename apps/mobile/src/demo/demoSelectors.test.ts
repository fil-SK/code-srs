import { leafDecks } from '@itera/core'
import { filterAndSortDeckViewModels } from '@/src/components/library/deckSorting'
import {
  demoCollectionViewModel,
  demoDeckViewModel,
  demoLibraryViewModel,
  demoScopeRail,
  demoUnreadCount,
  findDemoCard,
  findDemoDeck,
  resolveDemoScope,
} from './demoSelectors'
import { createDemoSeed } from './demoWorkspace'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

// Route-parameter resolution, and the ordering the Library controls claim.
//
// Both Library routes used to ignore their parameter: the deck route handed
// deckId to a factory that returned Modern C++ whatever it was given, and the
// collection route collapsed every id to one boolean. So a deep link, a stale
// history entry or a typo silently displayed the wrong entity.

const entities = createDemoSeed(NOW)

describe('deck resolution', () => {
  it('resolves each deck to itself, not to whichever deck the factory preferred', () => {
    for (const deck of entities.decks) {
      expect(demoDeckViewModel(entities, deck.id, NOW)?.id).toBe(deck.id)
      expect(demoDeckViewModel(entities, deck.id, NOW)?.name).toBe(deck.name)
    }
  })

  it('returns null for an unknown deck id, so the route can say so', () => {
    expect(findDemoDeck(entities, 'fixture-does-not-exist')).toBeNull()
    expect(demoDeckViewModel(entities, 'fixture-does-not-exist', NOW)).toBeNull()
    expect(demoDeckViewModel(entities, undefined, NOW)).toBeNull()
    expect(demoDeckViewModel(entities, '', NOW)).toBeNull()
  })

  it('shows a deck only its own cards', () => {
    const deck = demoDeckViewModel(entities, 'fixture-modern-cpp', NOW)
    expect(deck?.cards.length).toBeGreaterThan(0)
    expect(deck?.cardCount).toBe(deck?.cards.length)

    const otherDeckCardIds = new Set(
      entities.cards.filter((card) => card.deckId !== 'fixture-modern-cpp').map((card) => card.id),
    )
    for (const card of deck?.cards ?? []) {
      expect(otherDeckCardIds.has(card.id)).toBe(false)
    }
  })

  it('names the deck s own collection on the way back out', () => {
    expect(demoDeckViewModel(entities, 'fixture-modern-cpp', NOW)?.collectionName).toBe('Languages & C++')
    expect(demoDeckViewModel(entities, 'fixture-security-engineering', NOW)?.collectionName).toBe('Unfiled')
  })
})

describe('card resolution', () => {
  it('resolves every populated demo card to itself', () => {
    expect(entities.cards.length).toBeGreaterThan(0)
    for (const card of entities.cards) {
      const found = findDemoCard(entities, card.id)
      expect(found?.id).toBe(card.id)
      expect(found?.deckId).toBe(card.deckId)
      expect(found?.interaction.type).toBe(card.interaction.type)
    }
  })

  it('resolves cards from different decks to different cards', () => {
    const decks = ['fixture-modern-cpp', 'fixture-compilers', 'fixture-algorithms']
    const first = decks.map(
      (deckId) => entities.cards.find((card) => card.deckId === deckId)!.id,
    )

    const resolved = first.map((id) => findDemoCard(entities, id))

    expect(new Set(resolved.map((card) => card?.id)).size).toBe(decks.length)
    resolved.forEach((card, index) => expect(card?.deckId).toBe(decks[index]))
  })

  it('returns null for an unknown card id, so the route can say so', () => {
    expect(findDemoCard(entities, 'fixture-card-does-not-exist')).toBeNull()
    expect(findDemoCard(entities, undefined)).toBeNull()
    expect(findDemoCard(entities, '')).toBeNull()
  })

  it('reaches a card of every interaction type the registry binds', () => {
    // Card study renders through the same registry a session does, so a demo
    // card of each type is what makes that coverage real rather than claimed.
    const types = new Set(entities.cards.map((card) => card.interaction.type))
    expect(types).toEqual(
      new Set(['recall', 'multiple_choice', 'write_code', 'ordering', 'matching', 'walkthrough']),
    )
  })
})

describe('scope resolution', () => {
  it('resolves every scope the rail offers', () => {
    for (const scope of demoScopeRail(entities)) {
      const resolved = resolveDemoScope(entities, scope.id)
      expect(resolved).not.toBeNull()
      expect(resolved?.decks.length).toBeGreaterThan(0)
    }
  })

  it('scopes a collection to its own decks', () => {
    const languages = demoCollectionViewModel(entities, 'fixture-languages-cpp', NOW)
    expect(languages?.name).toBe('Languages & C++')
    expect(languages?.decks.map((deck) => deck.id).sort()).toEqual([
      'fixture-compilers',
      'fixture-modern-cpp',
    ])
  })

  it('resolves a different collection to different decks', () => {
    // The old factory returned Interview Core for every id that was not
    // Languages & C++, so this is the case that used to be wrong.
    const research = demoCollectionViewModel(entities, 'fixture-research', NOW)
    expect(research?.name).toBe('Research')
    expect(research?.decks.map((deck) => deck.id)).toEqual(['fixture-compiler-papers'])
  })

  it('resolves unfiled to the decks with no collection', () => {
    const unfiled = resolveDemoScope(entities, 'unfiled')
    expect(unfiled?.decks.every((deck) => deck.parentId === undefined)).toBe(true)
    expect(unfiled?.decks.length).toBeGreaterThan(0)
  })

  it('resolves all to every browsable deck, and not to the collections', () => {
    const all = resolveDemoScope(entities, 'all')!
    expect(all.decks).toEqual(leafDecks(entities.decks))
    // The four collection decks are decks too, and must not be listed as rows.
    expect(all.decks.length).toBeLessThan(entities.decks.length)
    expect(all.decks.some((deck) => deck.id === 'fixture-interview-core')).toBe(false)
  })

  it('returns null for an unknown collection id', () => {
    expect(resolveDemoScope(entities, 'fixture-not-a-collection')).toBeNull()
    expect(demoCollectionViewModel(entities, 'fixture-not-a-collection', NOW)).toBeNull()
    expect(demoCollectionViewModel(entities, undefined, NOW)).toBeNull()
  })

  it('sums a collection s totals from its decks', () => {
    const languages = demoCollectionViewModel(entities, 'fixture-languages-cpp', NOW)
    expect(languages?.cardCount).toBe(
      languages?.decks.reduce((total, deck) => total + deck.cardCount, 0),
    )
    expect(languages?.dueToday).toBe(
      languages?.decks.reduce((total, deck) => total + deck.dueCount, 0),
    )
  })
})

describe('library filter and sort', () => {
  const decks = demoLibraryViewModel(entities, NOW).decks

  it('orders by name ascending', () => {
    const names = filterAndSortDeckViewModels(decks, { sort: 'name' }).map((deck) => deck.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('orders by due count, most due first', () => {
    const counts = filterAndSortDeckViewModels(decks, { sort: 'due' }).map((deck) => deck.dueCount)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('orders by card count, largest first', () => {
    const counts = filterAndSortDeckViewModels(decks, { sort: 'cardCount' }).map(
      (deck) => deck.cardCount,
    )
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('orders by last studied, most recent first and never-studied last', () => {
    const sorted = filterAndSortDeckViewModels(decks, { sort: 'lastStudied' })
    const stamps = sorted.map((deck) => deck.lastStudiedAt ?? 0)
    expect(stamps).toEqual([...stamps].sort((a, b) => b - a))
    expect(sorted[sorted.length - 1]?.lastStudiedAt).toBeUndefined()
  })

  it('produces a different order for different keys, so the label means something', () => {
    const byName = filterAndSortDeckViewModels(decks, { sort: 'name' }).map((deck) => deck.id)
    const byDue = filterAndSortDeckViewModels(decks, { sort: 'due' }).map((deck) => deck.id)
    expect(byName).not.toEqual(byDue)
  })

  it('keeps only decks with something due under the due-only filter', () => {
    const filtered = filterAndSortDeckViewModels(decks, { dueOnly: true, sort: 'name' })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.length).toBeLessThan(decks.length)
    expect(filtered.every((deck) => deck.dueCount > 0)).toBe(true)
  })

  it('searches name and description, case-insensitively', () => {
    expect(
      filterAndSortDeckViewModels(decks, { query: 'MODERN c++', sort: 'name' }).map((d) => d.id),
    ).toEqual(['fixture-modern-cpp'])

    // 'protocols' appears only in Computer Networks' description.
    expect(
      filterAndSortDeckViewModels(decks, { query: 'protocols', sort: 'name' }).map((d) => d.id),
    ).toEqual(['fixture-computer-networks'])
  })

  it('returns nothing for a search that matches nothing', () => {
    expect(filterAndSortDeckViewModels(decks, { query: 'zzzz', sort: 'name' })).toEqual([])
  })

  it('never invents or drops a deck while sorting', () => {
    const sorted = filterAndSortDeckViewModels(decks, { sort: 'due' })
    expect(sorted.length).toBe(decks.length)
    expect(new Set(sorted.map((deck) => deck.id))).toEqual(new Set(decks.map((deck) => deck.id)))
  })
})

describe('notification unread count', () => {
  it('counts the unread items', () => {
    const expected = entities.notifications.filter((item) => item.unread).length
    expect(demoUnreadCount(entities.notifications)).toBe(expected)
    expect(expected).toBeGreaterThan(0)
  })

  it('reaches zero once everything is read', () => {
    const allRead = entities.notifications.map((item) => ({ ...item, unread: false }))
    expect(demoUnreadCount(allRead)).toBe(0)
  })

  it('starts with unread items in both groups, so Mark all is testable from either', () => {
    for (const group of ['today', 'earlier'] as const) {
      expect(
        entities.notifications.some((item) => item.group === group && item.unread),
      ).toBe(true)
    }
  })
})
