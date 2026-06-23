import { beforeEach, describe, expect, it } from 'vitest'
import type { Card, Deck, ReviewLog } from '@/types'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { newId } from '@/lib/id'
import { AppDB } from './db'
import { DexieRepository } from './DexieRepository'

const db = new AppDB()
const repo = new DexieRepository(db)

beforeEach(async () => {
  await Promise.all([
    db.cards.clear(),
    db.decks.clear(),
    db.drafts.clear(),
    db.reviewLogs.clear(),
  ])
})

const DECK_ID = 'deck-1'

function basicCard(overrides: Partial<Card> = {}): Card {
  const now = 1_000
  return {
    id: newId(),
    deckId: DECK_ID,
    tags: [],
    createdAt: now,
    updatedAt: now,
    suspended: false,
    scheduling: initialSchedulingState(now),
    type: 'basic',
    content: { front: 'Q', back: 'A' },
    ...overrides,
  } as Card
}

describe('DexieRepository — CRUD', () => {
  it('puts and reads back an entity', async () => {
    const deck: Deck = {
      id: DECK_ID,
      name: 'C++',
      createdAt: 1,
      updatedAt: 1,
    }
    await repo.decks.put(deck)
    expect(await repo.decks.getById(DECK_ID)).toEqual(deck)
    expect(await repo.decks.getAll()).toHaveLength(1)
  })

  it('upserts on put and removes on delete', async () => {
    const card = basicCard()
    await repo.cards.put(card)
    await repo.cards.put({ ...card, updatedAt: 2_000 })
    expect(await repo.cards.getAll()).toHaveLength(1)
    expect((await repo.cards.getById(card.id))?.updatedAt).toBe(2_000)

    await repo.cards.delete(card.id)
    expect(await repo.cards.getById(card.id)).toBeUndefined()
  })

  it('bulkPut inserts many (import path)', async () => {
    await repo.cards.bulkPut([basicCard(), basicCard(), basicCard()])
    expect(await repo.cards.getAll()).toHaveLength(3)
  })
})

describe('DexieRepository — getDue', () => {
  it('returns due/new cards, excludes future and suspended, sorts by due', async () => {
    const now = 10_000
    const due1 = basicCard({ scheduling: { ...initialSchedulingState(), due: 5_000 } })
    const due2 = basicCard({ scheduling: { ...initialSchedulingState(), due: 9_000 } })
    const future = basicCard({ scheduling: { ...initialSchedulingState(), due: 50_000 } })
    const suspended = basicCard({
      suspended: true,
      scheduling: { ...initialSchedulingState(), due: 1_000 },
    })
    await repo.cards.bulkPut([due2, future, suspended, due1])

    const result = await repo.cards.getDue({ now })
    expect(result.map((c) => c.id)).toEqual([due1.id, due2.id])
  })

  it('filters by deck and honors limit', async () => {
    const now = 10_000
    const mine = basicCard({ deckId: 'a', scheduling: { ...initialSchedulingState(), due: 1 } })
    const other = basicCard({ deckId: 'b', scheduling: { ...initialSchedulingState(), due: 1 } })
    await repo.cards.bulkPut([mine, other])

    expect((await repo.cards.getDue({ now, deckId: 'a' })).map((c) => c.id)).toEqual([
      mine.id,
    ])
    expect(await repo.cards.getDue({ now, limit: 1 })).toHaveLength(1)
  })
})

describe('DexieRepository — search', () => {
  it('matches text in content and respects suspended', async () => {
    await repo.cards.bulkPut([
      basicCard({ content: { front: 'What is SSA form?', back: 'static single assignment' } }),
      basicCard({ content: { front: 'unrelated', back: 'nope' } }),
      basicCard({
        suspended: true,
        content: { front: 'SSA suspended', back: 'x' },
      }),
    ])

    const hits = await repo.cards.search({ text: 'ssa' })
    expect(hits).toHaveLength(1)
    expect(await repo.cards.search({ text: 'ssa', includeSuspended: true })).toHaveLength(2)
  })

  it('filters by type and tag', async () => {
    await repo.cards.bulkPut([
      basicCard({ tags: ['mlir'] }),
      basicCard({ tags: ['cpp'] }),
    ])
    expect(await repo.cards.search({ types: ['basic'] })).toHaveLength(2)
    expect(await repo.cards.search({ tags: ['mlir'] })).toHaveLength(1)
    expect(await repo.cards.search({ tags: ['rust'] })).toHaveLength(0)
  })
})

describe('DexieRepository — reviews', () => {
  function log(overrides: Partial<ReviewLog> = {}): ReviewLog {
    return {
      id: newId(),
      cardId: 'c1',
      reviewedAt: 100,
      rating: 3,
      autoGraded: false,
      durationMs: 1000,
      stabilityBefore: 0,
      stabilityAfter: 1,
      difficultyBefore: 5,
      difficultyAfter: 5,
      state: 'review',
      ...overrides,
    }
  }

  it('appends and reads logs for a card sorted by time', async () => {
    await repo.reviews.append(log({ reviewedAt: 300 }))
    await repo.reviews.append(log({ reviewedAt: 100 }))
    await repo.reviews.append(log({ cardId: 'other', reviewedAt: 200 }))

    const forC1 = await repo.reviews.forCard('c1')
    expect(forC1.map((l) => l.reviewedAt)).toEqual([100, 300])
  })

  it('queries logs in a time range (inclusive)', async () => {
    await repo.reviews.append(log({ reviewedAt: 50 }))
    await repo.reviews.append(log({ reviewedAt: 150 }))
    await repo.reviews.append(log({ reviewedAt: 250 }))

    expect(await repo.reviews.range(100, 200)).toHaveLength(1)
    expect(await repo.reviews.range(50, 250)).toHaveLength(3)
  })

  it('deletes a log (undo path)', async () => {
    const entry = log()
    await repo.reviews.append(entry)
    await repo.reviews.delete(entry.id)
    expect(await repo.reviews.forCard('c1')).toHaveLength(0)
  })
})
