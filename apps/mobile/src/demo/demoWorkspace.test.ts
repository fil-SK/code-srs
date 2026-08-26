import { createDemoSeed, DEMO_COLLECTION_RAIL } from './demoWorkspace'
import { isDemoCardDue } from './demoScheduling'
import { deriveCollections, leafDecks, metricsFor } from '@itera/core'
import { demoDeckMetrics, demoTodayViewModel, demoProgressViewModel } from './demoSelectors'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

// Referential integrity for the demo entities.
//
// This is the test the old fixtures needed and never had. Before the workspace
// existed, one deck was called fixture-distributed-systems in Library,
// fixture-systems in Today (which was also a collection id) and
// fixture-systems-distributed in Progress, and the same deck reported four
// different card counts across four screens. Nothing failed, because nothing
// checked. These cases fail if an id ever stops pointing at a real entity or a
// derived number stops agreeing with the cards it is derived from.


// A fixed greeting, so these assertions do not depend on a random pick.
const DEMO_GREETING = { mainText: 'Ready to learn?', subtext: 'A demo greeting.' }

const entities = createDemoSeed(NOW)
const deckIds = new Set(entities.decks.map((deck) => deck.id))
// Collections are derived, never authored: the same rule web applies, through
// core's own helper.
const collections = deriveCollections(entities.decks)
const collectionIds = new Set(collections.map((collection) => collection.id))

describe('demo workspace referential integrity', () => {
  it('gives every entity a unique id', () => {
    expect(deckIds.size).toBe(entities.decks.length)
    expect(collectionIds.size).toBe(collections.length)
    expect(new Set(entities.cards.map((card) => card.id)).size).toBe(entities.cards.length)
    expect(new Set(entities.notifications.map((item) => item.id)).size).toBe(
      entities.notifications.length,
    )
  })

  it('files every deck under a parent that exists, or explicitly nowhere', () => {
    for (const deck of entities.decks) {
      if (deck.parentId === undefined) continue
      expect(deckIds.has(deck.parentId)).toBe(true)
    }
  })

  it('attaches every card to a deck that exists', () => {
    for (const card of entities.cards) {
      expect(deckIds.has(card.deckId)).toBe(true)
    }
  })

  it('points every notification destination at an entity that exists', () => {
    for (const item of entities.notifications) {
      const destination = item.destination
      if (!destination) continue
      if (destination.kind === 'deck') expect(deckIds.has(destination.deckId)).toBe(true)
      if (destination.kind === 'collection') {
        expect(collectionIds.has(destination.collectionId)).toBe(true)
      }
    }
  })

  // A notification that only marks itself read is a supported shape, but a demo
  // inbox full of them is a row of dead ends in the first surface a prospective
  // user taps. Every seeded notification answers with a real destination.
  it('gives every seeded notification a destination', () => {
    for (const item of entities.notifications) {
      expect(item.destination).toBeDefined()
    }
  })

  it('resolves every scope in the rail', () => {
    for (const scopeId of DEMO_COLLECTION_RAIL) {
      if (scopeId === 'all' || scopeId === 'unfiled') continue
      expect(collectionIds.has(scopeId)).toBe(true)
    }
  })

  it('leaves no collection scope empty, and no unfiled scope empty', () => {
    // A visible scope that leads nowhere is a fake category. Either it has demo
    // content or it should not be in the rail.
    for (const collection of collections) {
      expect(entities.decks.some((deck) => deck.parentId === collection.id)).toBe(true)
    }
    expect(leafDecks(entities.decks).some((deck) => deck.parentId === undefined)).toBe(true)
  })

  it('references decks that exist from Today and from Progress', () => {
    for (const deck of demoTodayViewModel(entities, DEMO_GREETING, NOW).decks) {
      expect(deckIds.has(deck.id)).toBe(true)
    }
    for (const deck of demoProgressViewModel(entities, NOW).decks) {
      expect(deckIds.has(deck.id)).toBe(true)
    }
  })
})

describe('demo workspace derived numbers', () => {
  const metrics = demoDeckMetrics(entities, NOW)

  it('derives every deck count from that deck s cards', () => {
    for (const deck of entities.decks) {
      const deckCards = entities.cards.filter((card) => card.deckId === deck.id)
      expect(metricsFor(metrics, deck.id).cardCount).toBe(deckCards.length)
      expect(metricsFor(metrics, deck.id).dueCount).toBe(deckCards.filter((card) => isDemoCardDue(card, NOW)).length)
    }
  })

  it('agrees between Today s total and the per-deck totals', () => {
    const today = demoTodayViewModel(entities, DEMO_GREETING, NOW)
    const summed = today.decks.reduce((total, deck) => total + deck.dueCount, 0)
    expect(today.dueToday).toBe(summed)
  })

  it('reports the same due count on Today and on Progress for the same deck', () => {
    const today = demoTodayViewModel(entities, DEMO_GREETING, NOW)
    const progress = demoProgressViewModel(entities, NOW)

    for (const todayDeck of today.decks) {
      const progressDeck = progress.decks.find((deck) => deck.id === todayDeck.id)
      if (!progressDeck) continue
      expect(progressDeck.dueLabel).toBe(`${todayDeck.dueCount} due`)
    }
  })

  it('keeps one streak and one retention figure across screens', () => {
    const today = demoTodayViewModel(entities, DEMO_GREETING, NOW)
    const progress = demoProgressViewModel(entities, NOW)

    const streak = progress.metrics.find((metric) => metric.id === 'streak')
    expect(streak?.value).toBe(`${today.streak} days`)
    expect(progress.retentionPercent).toBe(today.retention)
  })

  it('derives Today deterministically, including after the workspace changes', () => {
    // The greeting is passed in rather than picked here. When the selector
    // picked it, marking a notification read changed the workspace value and
    // re-rolled Today's greeting as a side effect of opening the inbox.
    const read = {
      ...entities,
      notifications: entities.notifications.map((item) => ({ ...item, unread: false })),
    }

    expect(demoTodayViewModel(entities, DEMO_GREETING, NOW)).toEqual(
      demoTodayViewModel(entities, DEMO_GREETING, NOW),
    )
    expect(demoTodayViewModel(read, DEMO_GREETING, NOW).greeting).toEqual(DEMO_GREETING)
  })

  it('never claims mastery for a deck with no cards', () => {
    for (const deck of entities.decks) {
      if (metrics.get(deck.id)?.cardCount === 0) {
        expect(metrics.get(deck.id)?.masteryFraction).toBe(0)
      }
    }
  })
})
