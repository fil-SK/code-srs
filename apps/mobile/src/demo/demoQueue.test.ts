import { createDemoQueue, demoQueueDeckNames, DEMO_SESSION_LIMIT } from './demoQueue'
import { isDemoCardDue } from './demoScheduling'
import { createDemoWorkspace } from './demoWorkspace'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

const workspace = createDemoWorkspace(NOW)

describe('createDemoQueue', () => {
  it('takes only cards that are due', () => {
    const queue = createDemoQueue(workspace, { now: NOW })

    expect(queue.length).toBeGreaterThan(0)
    for (const card of queue) expect(isDemoCardDue(card, NOW)).toBe(true)
  })

  it('takes every due card the demo has, under the limit', () => {
    const due = workspace.cards.filter((card) => isDemoCardDue(card, NOW))
    expect(due.length).toBeLessThanOrEqual(DEMO_SESSION_LIMIT)
    expect(createDemoQueue(workspace, { now: NOW })).toHaveLength(due.length)
  })

  it('orders the most overdue card first', () => {
    const queue = createDemoQueue(workspace, { now: NOW })

    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].scheduling.due).toBeGreaterThanOrEqual(queue[i - 1].scheduling.due)
    }
  })

  it('produces the same order every time', () => {
    // The demo is meant to be recordable: two runs must show the same cards in
    // the same order, which is what the id tie-break is for.
    const a = createDemoQueue(createDemoWorkspace(NOW), { now: NOW }).map((card) => card.id)
    const b = createDemoQueue(createDemoWorkspace(NOW), { now: NOW }).map((card) => card.id)

    expect(a).toEqual(b)
  })

  it('scopes to one deck when asked', () => {
    const queue = createDemoQueue(workspace, { now: NOW, deckId: 'fixture-compilers' })

    expect(queue.length).toBeGreaterThan(0)
    for (const card of queue) expect(card.deckId).toBe('fixture-compilers')
  })

  it('bounds the session', () => {
    expect(createDemoQueue(workspace, { now: NOW, limit: 3 })).toHaveLength(3)
  })

  it('is empty once nothing is due', () => {
    // Far enough forward that every seeded due date has passed... which would
    // make everything due. The honest empty case is the opposite: an instant
    // before the earliest due date.
    const before = Math.min(...workspace.cards.map((card) => card.scheduling.due)) - 1
    expect(createDemoQueue(workspace, { now: before })).toEqual([])
  })

  it('never queues a suspended card', () => {
    const suspended = {
      ...workspace,
      cards: workspace.cards.map((card) => ({ ...card, suspended: true })),
    }
    expect(createDemoQueue(suspended, { now: NOW })).toEqual([])
  })
})

describe('demoQueueDeckNames', () => {
  it('names each contributing deck once, in queue order', () => {
    const queue = createDemoQueue(workspace, { now: NOW })
    const names = demoQueueDeckNames(workspace, queue)

    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
      expect(workspace.decks.some((deck) => deck.name === name)).toBe(true)
    }
  })

  it('names nothing for an empty queue', () => {
    expect(demoQueueDeckNames(workspace, [])).toEqual([])
  })
})
