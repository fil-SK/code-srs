import { startOfDay } from '@itera/core'

import { createDemoWorkspace } from './demoWorkspace'

// Notification copy is derived from the same entities the screens show, so the
// inbox cannot state something the rest of the app contradicts. These assert
// the two claims that are about *entities* rather than about counts, because
// those are the ones that were wrong: "N new cards were added" counted every
// card in the collection and called all of them new, and the import row carried
// a hand-written date that had no relationship to the deck it named.

const NOW = Date.UTC(2026, 7, 25, 9, 0, 0)
const workspace = createDemoWorkspace(NOW)

function notification(id: string) {
  const item = workspace.notifications.find((entry) => entry.id === id)
  if (!item) throw new Error('missing demo notification ' + id)
  return item
}

describe('new cards added', () => {
  it('counts only the cards actually added on the day it reports', () => {
    const interviewCoreDeckIds = new Set(
      workspace.decks
        .filter((deck) => deck.collectionId === 'fixture-interview-core')
        .map((deck) => deck.id),
    )
    const cards = workspace.cards.filter((card) => interviewCoreDeckIds.has(card.deckId))
    const latestAddedAt = Math.max(...cards.map((card) => card.createdAt))
    const addedThen = cards.filter(
      (card) => startOfDay(card.createdAt) === startOfDay(latestAddedAt),
    ).length

    // The whole collection is deliberately larger than one day's additions -
    // otherwise this would pass on a fixture where the old bug was invisible.
    expect(cards.length).toBeGreaterThan(addedThen)

    const item = notification('fixture-new-cards')
    expect(item.body).toContain(String(addedThen))
    expect(item.body).not.toContain(String(cards.length))
  })

  it('agrees with itself about singular and plural', () => {
    const item = notification('fixture-new-cards')
    const singular = item.body.startsWith('1 new card was')
    expect(singular ? item.title : 'New cards added').toBe(item.title)
    expect(singular).toBe(item.title === 'New card added')
  })
})

describe('deck import completed', () => {
  it('is dated from the deck it names, not from an authored string', () => {
    const deck = workspace.decks.find((entry) => entry.id === 'fixture-computer-networks')!
    const item = notification('fixture-import')

    // The deck is authored one day before the anchor, so on the learner's
    // timeline the import happened yesterday - and says so.
    expect(item.timeLabel).toBe('Yesterday')
    expect(deck.createdAt).toBeLessThanOrEqual(workspace.startedAt)
  })
})

describe('dates on the learner s timeline', () => {
  it('stays as fresh on a later recording day as on the first one', () => {
    // Entity dates are authored against a fixed epoch while the learning
    // history is replayed relative to the current local day. Anything the
    // learner reads has to follow the second clock, or a demo recorded months
    // from now would open on an inbox dated last summer.
    const muchLater = createDemoWorkspace(NOW + 400 * 86_400_000)
    const later = muchLater.notifications.find((entry) => entry.id === 'fixture-import')!

    expect(later.timeLabel).toBe('Yesterday')
  })
})
