import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { newId } from '@/lib/id'
import { AppDB } from '@/data/dexie/db'
import { DexieRepository } from '@/data/dexie/DexieRepository'
import { createCardStateBackfill } from './cardStateBackfill'

const db = new AppDB()
const repo = new DexieRepository(db)

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.cardStates.clear()])
})

function basicCard(overrides: Partial<Card> = {}): Card {
  const now = 1_000
  return {
    id: newId(),
    deckId: 'deck-1',
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

describe('createCardStateBackfill', () => {
  it('dryRun reports every card as changed and writes nothing', async () => {
    const a = basicCard()
    const b = basicCard()
    await repo.cards.bulkPut([a, b])

    const backfill = createCardStateBackfill(repo)
    const report = await backfill.dryRun()

    expect(report.beforeCounts).toEqual({ cards: 2, cardStates: 0 })
    expect(report.afterCounts).toEqual({ cards: 2, cardStates: 2 })
    expect(report.changed.sort()).toEqual([a.id, b.id].sort())
    expect(report.skipped).toEqual([])
    expect(await repo.cardStates.getAll()).toHaveLength(0) // dry run writes nothing
  })

  it('apply writes one CardState row per card, matching scheduling + suspended exactly', async () => {
    const card = basicCard({
      suspended: true,
      scheduling: { ...initialSchedulingState(1_000), reps: 3, stability: 5.5, due: 9_999 },
    })
    await repo.cards.put(card)

    const backfill = createCardStateBackfill(repo)
    await backfill.apply()

    const state = await repo.cardStates.getById(card.id)
    expect(state).toEqual({
      cardId: card.id,
      due: 9_999,
      state: 'new',
      stability: 5.5,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 3,
      lapses: 0,
      suspended: true,
      lastReview: undefined,
    })
  })

  it('is idempotent: a second apply reports everything as skipped, nothing as changed', async () => {
    await repo.cards.bulkPut([basicCard(), basicCard(), basicCard()])
    const backfill = createCardStateBackfill(repo)

    const first = await backfill.apply()
    expect(first.changed).toHaveLength(3)

    const second = await backfill.apply()
    expect(second.changed).toHaveLength(0)
    expect(second.skipped).toHaveLength(3)
    expect(await repo.cardStates.getAll()).toHaveLength(3) // no duplicates
  })

  it('re-backfills only a card whose scheduling actually changed since the last run', async () => {
    const card = basicCard()
    await repo.cards.put(card)
    const backfill = createCardStateBackfill(repo)
    await backfill.apply()

    const graded = { ...card, scheduling: { ...card.scheduling, reps: 1, due: 5_000 } }
    await repo.cards.put(graded)

    const report = await backfill.apply()
    expect(report.changed).toEqual([card.id])
    expect((await repo.cardStates.getById(card.id))?.reps).toBe(1)
  })

  it('reports a CardState row with no matching Card as an orphan, without deleting it', async () => {
    await repo.cardStates.put({
      cardId: 'ghost-card',
      due: 0,
      state: 'new',
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      suspended: false,
    })

    const backfill = createCardStateBackfill(repo)
    const report = await backfill.dryRun()

    expect(report.orphans).toEqual(['ghost-card'])
    expect(await repo.cardStates.getById('ghost-card')).toBeTruthy() // not deleted
  })

  it('rollbackInstructions explains this migration is purely additive', () => {
    const backfill = createCardStateBackfill(repo)
    expect(backfill.rollbackInstructions()).toMatch(/additive/i)
  })
})
