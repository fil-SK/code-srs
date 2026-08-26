import {
  createDemoQueue,
  demoDeckScopeIds,
  demoQueueDeckNames,
  DEMO_SESSION_LIMIT,
} from './demoQueue'
import { isDemoCardDue } from './demoScheduling'
import { createDemoSeed } from './demoWorkspace'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

const entities = createDemoSeed(NOW)

describe('createDemoQueue', () => {
  it('takes only cards that are due', () => {
    const queue = createDemoQueue(entities, { now: NOW })

    expect(queue.length).toBeGreaterThan(0)
    for (const card of queue) expect(isDemoCardDue(card, NOW)).toBe(true)
  })

  it('takes every due card the demo has, under the limit', () => {
    const due = entities.cards.filter((card) => isDemoCardDue(card, NOW))
    expect(due.length).toBeLessThanOrEqual(DEMO_SESSION_LIMIT)
    expect(createDemoQueue(entities, { now: NOW })).toHaveLength(due.length)
  })

  it('orders the most overdue card first', () => {
    const queue = createDemoQueue(entities, { now: NOW })

    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].scheduling.due).toBeGreaterThanOrEqual(queue[i - 1].scheduling.due)
    }
  })

  it('produces the same order every time', () => {
    // The demo is meant to be recordable: two runs must show the same cards in
    // the same order, which is what the id tie-break is for.
    const a = createDemoQueue(createDemoSeed(NOW), { now: NOW }).map((card) => card.id)
    const b = createDemoQueue(createDemoSeed(NOW), { now: NOW }).map((card) => card.id)

    expect(a).toEqual(b)
  })

  it('scopes to one deck when asked', () => {
    const queue = createDemoQueue(entities, { now: NOW, deckId: 'fixture-compilers' })

    expect(queue.length).toBeGreaterThan(0)
    for (const card of queue) expect(card.deckId).toBe('fixture-compilers')
  })

  it('leaves out every card the scope does not cover', () => {
    const scope = demoDeckScopeIds(entities, 'fixture-compilers')
    const queue = createDemoQueue(entities, { now: NOW, deckId: 'fixture-compilers' })
    const excluded = entities.cards.filter((card) => !scope.has(card.deckId))

    expect(excluded.length).toBeGreaterThan(0)
    for (const card of excluded) expect(queue.some((entry) => entry.id === card.id)).toBe(false)
  })

  it('keeps a scoped queue due-only and deterministic', () => {
    const build = () =>
      createDemoQueue(createDemoSeed(NOW), { now: NOW, deckId: 'fixture-algorithms' }).map(
        (card) => card.id,
      )

    const scoped = createDemoQueue(entities, { now: NOW, deckId: 'fixture-algorithms' })
    expect(scoped.length).toBeGreaterThan(0)
    for (const card of scoped) expect(isDemoCardDue(card, NOW)).toBe(true)
    expect(build()).toEqual(build())
  })

  it('matches nothing for a deck id that names no deck', () => {
    // The queue stays pure and simply covers nothing. Refusing the navigation
    // is the route's job - what must never happen here is the unknown scope
    // widening back out to every card.
    expect(demoDeckScopeIds(entities, 'fixture-nonexistent')).toEqual(
      new Set(['fixture-nonexistent']),
    )
    expect(createDemoQueue(entities, { now: NOW, deckId: 'fixture-nonexistent' })).toEqual([])
  })

  it('is empty for a deck that has cards but nothing due', () => {
    const deckCards = entities.cards.filter((card) => card.deckId === 'fixture-modern-cpp')
    const beforeAnythingIsDue = Math.min(...deckCards.map((card) => card.scheduling.due)) - 1

    expect(deckCards.length).toBeGreaterThan(0)
    expect(
      createDemoQueue(entities, { now: beforeAnythingIsDue, deckId: 'fixture-modern-cpp' }),
    ).toEqual([])
  })

  it('bounds the session', () => {
    expect(createDemoQueue(entities, { now: NOW, limit: 3 })).toHaveLength(3)
  })

  it('is empty once nothing is due', () => {
    // Far enough forward that every seeded due date has passed... which would
    // make everything due. The honest empty case is the opposite: an instant
    // before the earliest due date.
    const before = Math.min(...entities.cards.map((card) => card.scheduling.due)) - 1
    expect(createDemoQueue(entities, { now: before })).toEqual([])
  })

  it('never queues a suspended card', () => {
    const suspended = {
      ...entities,
      cards: entities.cards.map((card) => ({ ...card, suspended: true })),
    }
    expect(createDemoQueue(suspended, { now: NOW })).toEqual([])
  })
})

describe('demoQueueDeckNames', () => {
  it('names each contributing deck once, in queue order', () => {
    const queue = createDemoQueue(entities, { now: NOW })
    const names = demoQueueDeckNames(entities, queue)

    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
      expect(entities.decks.some((deck) => deck.name === name)).toBe(true)
    }
  })

  it('names nothing for an empty queue', () => {
    expect(demoQueueDeckNames(entities, [])).toEqual([])
  })
})
