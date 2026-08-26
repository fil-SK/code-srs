import {
  createCard,
  initialSchedulingState,
  richText,
  type Card,
  type Deck,
  type ReviewLog,
  type WorkspaceSnapshot,
} from '@itera/core'

import { createDemoSeed } from '@/src/demo/demoWorkspace'
import { InMemoryRepository } from './InMemoryRepository'

// The Demo backend against the canonical Repository contract.
//
// These are backend tests, not demo tests: they assert the contract every
// Repository shares, so the demo runtime cannot quietly answer a shared hook
// differently from Dexie or Supabase. Where the contract leaves something to the
// backend - ordering, duplicate commits - the reasoning is stated on the case.

const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

function seedSnapshot(): WorkspaceSnapshot {
  const seed = createDemoSeed(NOW)
  return { cards: seed.cards, decks: seed.decks, drafts: [], reviewLogs: seed.reviewLogs, roadmaps: [] }
}

function repo(): InMemoryRepository {
  return new InMemoryRepository(seedSnapshot())
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    ...createCard(
      {
        deckId: 'fixture-algorithms',
        prompt: richText('Q'),
        interaction: { type: 'recall', answer: richText('A') },
        tags: [],
      },
      NOW,
    ),
    ...overrides,
  }
}

function makeLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: 'log-1',
    cardId: 'card-1',
    reviewedAt: NOW,
    rating: 3,
    durationMs: 1000,
    stateBefore: 'review',
    state: 'review',
    stabilityAfter: 10,
    difficultyAfter: 5,
    dueAfter: NOW + 86_400_000,
    ...overrides,
  } as ReviewLog
}

describe('seeded reads', () => {
  it('returns the seeded decks and cards', async () => {
    const seed = createDemoSeed(NOW)
    const r = repo()

    expect(await r.decks.getAll()).toHaveLength(seed.decks.length)
    expect(await r.cards.search({ includeSuspended: true })).toHaveLength(seed.cards.length)
    expect(await r.reviews.all()).toHaveLength(seed.reviewLogs.length)
  })

  it('reads one entity by id, and answers undefined for an id it does not have', async () => {
    const r = repo()
    expect((await r.decks.getById('fixture-modern-cpp'))?.name).toBe('Modern C++ & Memory')
    expect(await r.decks.getById('nope')).toBeUndefined()
    expect(await r.cards.getById('nope')).toBeUndefined()
  })

  it('hands out copies of its own collections, so a caller cannot mutate the store', async () => {
    const r = repo()
    const decks = await r.decks.getAll()
    decks.pop()
    expect(await r.decks.getAll()).toHaveLength(decks.length + 1)
  })

  it('starts empty when given no seed, rather than inventing content', async () => {
    const r = new InMemoryRepository()
    expect(await r.decks.getAll()).toEqual([])
    expect(await r.cards.search({})).toEqual([])
    expect(await r.reviews.all()).toEqual([])
    expect(await r.drafts.getAll()).toEqual([])
    expect(await r.roadmaps.getAll()).toEqual([])
  })
})

describe('deck writes', () => {
  it('creates a deck', async () => {
    const r = repo()
    const before = (await r.decks.getAll()).length
    const deck: Deck = { id: 'new-deck', name: 'New', createdAt: NOW, updatedAt: NOW }

    await r.decks.put(deck)

    expect(await r.decks.getById('new-deck')).toEqual(deck)
    expect(await r.decks.getAll()).toHaveLength(before + 1)
  })

  it('updates in place, because put is an upsert', async () => {
    const r = repo()
    const before = (await r.decks.getAll()).length
    const deck = (await r.decks.getById('fixture-modern-cpp'))!

    await r.decks.put({ ...deck, name: 'Renamed' })

    expect((await r.decks.getById('fixture-modern-cpp'))?.name).toBe('Renamed')
    expect(await r.decks.getAll()).toHaveLength(before)
  })

  it('deletes exactly one row and cascades nothing', async () => {
    const r = repo()
    const cardsBefore = await r.cards.search({ deckId: 'fixture-modern-cpp' })
    const logsBefore = await r.reviews.all()
    expect(cardsBefore.length).toBeGreaterThan(0)

    await r.decks.delete('fixture-modern-cpp')

    expect(await r.decks.getById('fixture-modern-cpp')).toBeUndefined()
    // The same non-cascade Dexie and Postgres have. Whether a non-empty deck may
    // be deleted is a product rule the UI enforces, not something the backend
    // decides by deleting more than it was asked to.
    expect(await r.cards.search({ deckId: 'fixture-modern-cpp' })).toHaveLength(cardsBefore.length)
    expect(await r.reviews.all()).toHaveLength(logsBefore.length)
  })

  it('ignores a delete for an id it does not have', async () => {
    const r = repo()
    const before = (await r.decks.getAll()).length
    await r.decks.delete('nope')
    expect(await r.decks.getAll()).toHaveLength(before)
  })
})

describe('card writes', () => {
  it('creates and updates a card', async () => {
    const r = repo()
    const card = makeCard({ id: 'card-new' })

    await r.cards.put(card)
    expect(await r.cards.getById('card-new')).toEqual(card)

    await r.cards.put({ ...card, suspended: true })
    expect((await r.cards.getById('card-new'))?.suspended).toBe(true)
  })

  it('deletes one card and keeps its review logs, by design', async () => {
    const r = repo()
    const logs = await r.reviews.all()
    const logged = logs[0]

    await r.cards.delete(logged.cardId)

    expect(await r.cards.getById(logged.cardId)).toBeUndefined()
    // Review history outlives its card: it is a record of what was studied, and
    // every stats consumer already resolves an orphan through buildCardDeckMap.
    expect(await r.reviews.forCard(logged.cardId)).not.toHaveLength(0)
  })
})

describe('search', () => {
  it('excludes suspended cards unless asked', async () => {
    const r = repo()
    const card = (await r.cards.search({ deckId: 'fixture-modern-cpp' }))[0]
    await r.cards.put({ ...card, suspended: true })

    const plain = await r.cards.search({ deckId: 'fixture-modern-cpp' })
    const withSuspended = await r.cards.search({
      deckId: 'fixture-modern-cpp',
      includeSuspended: true,
    })

    expect(plain.some((entry) => entry.id === card.id)).toBe(false)
    expect(withSuspended.some((entry) => entry.id === card.id)).toBe(true)
  })

  it('scopes to one deck', async () => {
    const r = repo()
    const rows = await r.cards.search({ deckId: 'fixture-modern-cpp' })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.deckId).toBe('fixture-modern-cpp')
  })

  it('filters by interaction type', async () => {
    const r = repo()
    const rows = await r.cards.search({ types: ['matching'] })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.interaction.type).toBe('matching')
  })

  it('matches text through the one shared searchableText', async () => {
    const r = repo()
    await r.cards.put(makeCard({ id: 'needle', prompt: richText('A very distinctive haystack') }))

    expect((await r.cards.search({ text: 'distinctive haystack' })).map((c) => c.id)).toEqual([
      'needle',
    ])
    expect(await r.cards.search({ text: 'no card says this' })).toEqual([])
  })

  it('filters by tag', async () => {
    const r = repo()
    await r.cards.put(makeCard({ id: 'tagged', tags: ['unique-tag'] }))
    expect((await r.cards.search({ tags: ['unique-tag'] })).map((c) => c.id)).toEqual(['tagged'])
  })

  it('orders by most recently updated, the way Dexie does', async () => {
    const r = repo()
    await r.cards.put(makeCard({ id: 'older', updatedAt: 1 }))
    await r.cards.put(makeCard({ id: 'newer', updatedAt: Number.MAX_SAFE_INTEGER }))

    const rows = await r.cards.search({ includeSuspended: true })
    expect(rows[0].id).toBe('newer')
    expect(rows.at(-1)?.id).toBe('older')
  })
})

describe('due query', () => {
  it('returns only cards due at or before the instant asked about', async () => {
    const r = repo()
    const due = await r.cards.getDue({ now: NOW })
    expect(due.length).toBeGreaterThan(0)
    for (const card of due) expect(card.scheduling.due).toBeLessThanOrEqual(NOW)
  })

  it('never returns a suspended card', async () => {
    const r = repo()
    const card = (await r.cards.getDue({ now: NOW }))[0]
    await r.cards.put({ ...card, suspended: true })

    expect((await r.cards.getDue({ now: NOW })).some((entry) => entry.id === card.id)).toBe(false)
  })

  it('scopes to one deck, and honours a limit', async () => {
    const r = repo()
    const scoped = await r.cards.getDue({ now: NOW, deckId: 'fixture-modern-cpp' })
    expect(scoped.length).toBeGreaterThan(1)
    for (const card of scoped) expect(card.deckId).toBe('fixture-modern-cpp')

    expect(await r.cards.getDue({ now: NOW, deckId: 'fixture-modern-cpp', limit: 1 })).toHaveLength(
      1,
    )
  })

  it('orders by due date and breaks ties on id, so a recorded demo is repeatable', async () => {
    const r = new InMemoryRepository()
    const scheduling = { ...initialSchedulingState(NOW), due: NOW - 1000 }
    for (const id of ['c', 'a', 'b']) {
      await r.cards.put(makeCard({ id, scheduling }))
    }

    expect((await r.cards.getDue({ now: NOW })).map((card) => card.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('review commit and revert', () => {
  it('writes the card and the log together', async () => {
    const r = repo()
    const card = (await r.cards.getDue({ now: NOW }))[0]
    const graded = { ...card, scheduling: { ...card.scheduling, reps: card.scheduling.reps + 1 } }
    const log = makeLog({ id: 'log-new', cardId: card.id })
    const logsBefore = (await r.reviews.all()).length

    await r.commitReview({ card: graded, log })

    expect((await r.cards.getById(card.id))?.scheduling.reps).toBe(card.scheduling.reps + 1)
    expect(await r.reviews.all()).toHaveLength(logsBefore + 1)
  })

  it('is idempotent on the log id, so a double-tapped rating records one review', async () => {
    const r = repo()
    const card = (await r.cards.getDue({ now: NOW }))[0]
    const log = makeLog({ id: 'log-new', cardId: card.id })
    const logsBefore = (await r.reviews.all()).length

    await r.commitReview({ card, log })
    await r.commitReview({ card, log })

    expect(await r.reviews.all()).toHaveLength(logsBefore + 1)
  })

  it('reverts by restoring the caller s card verbatim and removing that one log', async () => {
    const r = repo()
    const card = (await r.cards.getDue({ now: NOW }))[0]
    const graded = { ...card, scheduling: { ...card.scheduling, reps: 99 } }
    const log = makeLog({ id: 'log-new', cardId: card.id })
    const logsBefore = await r.reviews.all()

    await r.commitReview({ card: graded, log })
    await r.revertReview({ card, logId: log.id })

    expect(await r.cards.getById(card.id)).toEqual(card)
    expect(await r.reviews.all()).toEqual(logsBefore)
  })

  it('ignores a revert for a log it does not have, rather than writing the card anyway', async () => {
    const r = repo()
    const card = (await r.cards.getDue({ now: NOW }))[0]

    await r.revertReview({ card: { ...card, scheduling: { ...card.scheduling, reps: 99 } }, logId: 'nope' })

    expect((await r.cards.getById(card.id))?.scheduling.reps).toBe(card.scheduling.reps)
  })

  it('promises transactional writes, because a synchronous object swap really is one', () => {
    const r = repo()
    expect(r.reviewGuarantee).toBe('transactional')
    expect(r.importGuarantee).toBe('transactional')
  })
})

describe('whole-workspace writes', () => {
  it('replaces everything', async () => {
    const r = repo()
    const deck: Deck = { id: 'only', name: 'Only', createdAt: NOW, updatedAt: NOW }

    await r.replaceAll({ cards: [], decks: [deck], drafts: [], reviewLogs: [], roadmaps: [] })

    expect(await r.decks.getAll()).toEqual([deck])
    expect(await r.cards.search({ includeSuspended: true })).toEqual([])
    expect(await r.reviews.all()).toEqual([])
  })

  it('merges over what is already stored', async () => {
    const r = repo()
    const decksBefore = (await r.decks.getAll()).length
    const deck: Deck = { id: 'extra', name: 'Extra', createdAt: NOW, updatedAt: NOW }

    await r.mergeAll({ cards: [], decks: [deck], drafts: [], reviewLogs: [], roadmaps: [] })

    expect(await r.decks.getAll()).toHaveLength(decksBefore + 1)
    expect(await r.decks.getById('extra')).toEqual(deck)
  })

  it('implements the stores mobile has no UI for, rather than throwing on them', async () => {
    const r = repo()
    await r.drafts.put({ id: 'd1', body: 'x', createdAt: NOW, updatedAt: NOW } as never)
    await r.roadmaps.put({ id: 'r1', name: 'R', nodes: [], edges: [], createdAt: NOW, updatedAt: NOW } as never)

    expect(await r.drafts.getAll()).toHaveLength(1)
    expect(await r.roadmaps.getAll()).toHaveLength(1)

    await r.drafts.clear()
    await r.roadmaps.clear()
    expect(await r.drafts.getAll()).toEqual([])
    expect(await r.roadmaps.getAll()).toEqual([])
  })
})

describe('review store', () => {
  it('appends, deletes and reads a card s history in review order', async () => {
    const r = new InMemoryRepository()
    await r.reviews.append(makeLog({ id: 'b', cardId: 'c1', reviewedAt: 200 }))
    await r.reviews.append(makeLog({ id: 'a', cardId: 'c1', reviewedAt: 100 }))
    await r.reviews.append(makeLog({ id: 'other', cardId: 'c2', reviewedAt: 150 }))

    expect((await r.reviews.forCard('c1')).map((log) => log.id)).toEqual(['a', 'b'])

    await r.reviews.delete('a')
    expect((await r.reviews.forCard('c1')).map((log) => log.id)).toEqual(['b'])
  })

  it('reads an inclusive range', async () => {
    const r = new InMemoryRepository()
    await r.reviews.bulkPut([
      makeLog({ id: 'before', reviewedAt: 99 }),
      makeLog({ id: 'edge-low', reviewedAt: 100 }),
      makeLog({ id: 'edge-high', reviewedAt: 200 }),
      makeLog({ id: 'after', reviewedAt: 201 }),
    ])

    expect((await r.reviews.range(100, 200)).map((log) => log.id)).toEqual([
      'edge-low',
      'edge-high',
    ])
  })

  it('upserts on bulkPut rather than duplicating', async () => {
    const r = new InMemoryRepository()
    await r.reviews.append(makeLog({ id: 'a', rating: 1 }))
    await r.reviews.bulkPut([makeLog({ id: 'a', rating: 4 }), makeLog({ id: 'b' })])

    const all = await r.reviews.all()
    expect(all).toHaveLength(2)
    expect(all.find((log) => log.id === 'a')?.rating).toBe(4)
  })
})

describe('resetTo', () => {
  it('discards everything authored since the seed', async () => {
    const r = repo()
    await r.decks.put({ id: 'authored', name: 'Authored', createdAt: NOW, updatedAt: NOW })
    await r.cards.put(makeCard({ id: 'authored-card' }))

    r.resetTo(seedSnapshot())

    expect(await r.decks.getById('authored')).toBeUndefined()
    expect(await r.cards.getById('authored-card')).toBeUndefined()
    expect(await r.decks.getAll()).toHaveLength(createDemoSeed(NOW).decks.length)
  })
})
