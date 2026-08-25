import { createDemoWorkspace, DEMO_SCOPE_RAIL } from './demoWorkspace'
import { isDemoCardDue } from './demoScheduling'
import { demoDeckMetrics, demoTodayViewModel, demoProgressViewModel } from './demoSelectors'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

// Referential integrity for the demo workspace.
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

const workspace = createDemoWorkspace(NOW)
const deckIds = new Set(workspace.decks.map((deck) => deck.id))
const collectionIds = new Set(workspace.collections.map((collection) => collection.id))

describe('demo workspace referential integrity', () => {
  it('gives every entity a unique id', () => {
    expect(deckIds.size).toBe(workspace.decks.length)
    expect(collectionIds.size).toBe(workspace.collections.length)
    expect(new Set(workspace.cards.map((card) => card.id)).size).toBe(workspace.cards.length)
    expect(new Set(workspace.notifications.map((item) => item.id)).size).toBe(
      workspace.notifications.length,
    )
  })

  it('files every deck under a collection that exists, or explicitly nowhere', () => {
    for (const deck of workspace.decks) {
      if (deck.collectionId === null) continue
      expect(collectionIds.has(deck.collectionId)).toBe(true)
    }
  })

  it('attaches every card to a deck that exists', () => {
    for (const card of workspace.cards) {
      expect(deckIds.has(card.deckId)).toBe(true)
    }
  })

  it('points every notification destination at a deck that exists', () => {
    for (const item of workspace.notifications) {
      if (!item.deckId) continue
      expect(deckIds.has(item.deckId)).toBe(true)
    }
  })

  it('resolves every scope in the rail', () => {
    for (const scopeId of DEMO_SCOPE_RAIL) {
      if (scopeId === 'all' || scopeId === 'unfiled') continue
      expect(collectionIds.has(scopeId)).toBe(true)
    }
  })

  it('leaves no collection scope empty, and no unfiled scope empty', () => {
    // A visible scope that leads nowhere is a fake category. Either it has demo
    // content or it should not be in the rail.
    for (const collection of workspace.collections) {
      expect(workspace.decks.some((deck) => deck.collectionId === collection.id)).toBe(true)
    }
    expect(workspace.decks.some((deck) => deck.collectionId === null)).toBe(true)
  })

  it('references decks that exist from Today and from Progress', () => {
    for (const deck of demoTodayViewModel(workspace, DEMO_GREETING, NOW).decks) {
      expect(deckIds.has(deck.id)).toBe(true)
    }
    for (const deck of demoProgressViewModel(workspace, NOW).decks) {
      expect(deckIds.has(deck.id)).toBe(true)
    }
  })
})

describe('demo workspace derived numbers', () => {
  const metrics = demoDeckMetrics(workspace, NOW)

  it('derives every deck count from that deck s cards', () => {
    for (const deck of workspace.decks) {
      const deckCards = workspace.cards.filter((card) => card.deckId === deck.id)
      expect(metrics.get(deck.id)?.cardCount).toBe(deckCards.length)
      expect(metrics.get(deck.id)?.dueCount).toBe(deckCards.filter((card) => isDemoCardDue(card, NOW)).length)
    }
  })

  it('agrees between Today s total and the per-deck totals', () => {
    const today = demoTodayViewModel(workspace, DEMO_GREETING, NOW)
    const summed = today.decks.reduce((total, deck) => total + deck.dueCount, 0)
    expect(today.dueToday).toBe(summed)
  })

  it('reports the same due count on Today and on Progress for the same deck', () => {
    const today = demoTodayViewModel(workspace, DEMO_GREETING, NOW)
    const progress = demoProgressViewModel(workspace, NOW)

    for (const todayDeck of today.decks) {
      const progressDeck = progress.decks.find((deck) => deck.id === todayDeck.id)
      if (!progressDeck) continue
      expect(progressDeck.dueLabel).toBe(`${todayDeck.dueCount} due`)
    }
  })

  it('keeps one streak and one retention figure across screens', () => {
    const today = demoTodayViewModel(workspace, DEMO_GREETING, NOW)
    const progress = demoProgressViewModel(workspace, NOW)

    const streak = progress.metrics.find((metric) => metric.id === 'streak')
    expect(streak?.value).toBe(`${today.streak} days`)
    expect(progress.retentionPercent).toBe(today.retention)
  })

  it('derives Today deterministically, including after the workspace changes', () => {
    // The greeting is passed in rather than picked here. When the selector
    // picked it, marking a notification read changed the workspace value and
    // re-rolled Today's greeting as a side effect of opening the inbox.
    const read = {
      ...workspace,
      notifications: workspace.notifications.map((item) => ({ ...item, unread: false })),
    }

    expect(demoTodayViewModel(workspace, DEMO_GREETING, NOW)).toEqual(
      demoTodayViewModel(workspace, DEMO_GREETING, NOW),
    )
    expect(demoTodayViewModel(read, DEMO_GREETING, NOW).greeting).toEqual(DEMO_GREETING)
  })

  it('never claims mastery for a deck with no cards', () => {
    for (const deck of workspace.decks) {
      if (metrics.get(deck.id)?.cardCount === 0) {
        expect(metrics.get(deck.id)?.masteryFraction).toBe(0)
      }
    }
  })
})
