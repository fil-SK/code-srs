import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card, ReviewLog } from '@/types'
import { fixtureCard, fixtureReviewLog } from '@/domain/io/backupFixtures'
import { AppDB } from './db'
import { DexieRepository } from './DexieRepository'

// The regression suite for audit §10 item 6: a graded card and its ReviewLog
// must be committed together or not at all. These run against the real Dexie
// transaction over fake-indexeddb, and every assertion reads the database back -
// nothing about the transaction is mocked, because the transaction IS the thing
// under test.
//
// Proven non-vacuous by replacing reviewWrite() with two bare awaits and
// confirming the rollback cases below fail, the same way D241 proved
// replaceAll's.

const names: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})

function freshDb(): AppDB {
  const name = `itera-review-tx-${Date.now()}-${Math.random()}`
  names.push(name)
  return new AppDB(name)
}

// The card as it stands before the grade.
function beforeCard(): Card {
  return fixtureCard('recall', { id: 'card-1', deckId: 'deck-1' })
}

// The same card with its scheduling advanced, exactly as reviewService computed
// it - this layer never recomputes anything.
function gradedCard(): Card {
  const card = beforeCard()
  return {
    ...card,
    updatedAt: 5_000,
    scheduling: { ...card.scheduling, reps: 1, due: 86_400_000, state: 'review' },
  }
}

function log(): ReviewLog {
  return fixtureReviewLog({ id: 'log-1', cardId: 'card-1', reviewedAt: 5_000 })
}

// Unrelated data that no review write may ever touch.
const OTHER_CARD = fixtureCard('ordering', { id: 'card-other', deckId: 'deck-1' })
const OTHER_LOG = fixtureReviewLog({ id: 'log-other', cardId: 'card-other' })

async function seed(db: AppDB): Promise<void> {
  await db.cards.bulkPut([beforeCard(), OTHER_CARD])
  await db.reviewLogs.bulkPut([OTHER_LOG])
}

async function stateOf(db: AppDB) {
  const card = await db.cards.get('card-1')
  return {
    reps: card?.scheduling.reps,
    due: card?.scheduling.due,
    logIds: (await db.reviewLogs.toArray()).map((l) => l.id).sort(),
    otherCardExists: Boolean(await db.cards.get('card-other')),
  }
}

// initialSchedulingState(1) - the fixture card has never been reviewed.
const UNGRADED = {
  reps: 0,
  due: beforeCard().scheduling.due,
  logIds: ['log-other'],
  otherCardExists: true,
}
const GRADED = {
  reps: 1,
  due: 86_400_000,
  logIds: ['log-1', 'log-other'],
  otherCardExists: true,
}

describe('DexieRepository.commitReview', () => {
  it('reports a transactional review guarantee', () => {
    expect(new DexieRepository(freshDb()).reviewGuarantee).toBe('transactional')
  })

  it('commits the graded card and its log together', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)

    await repo.commitReview({ card: gradedCard(), log: log() })

    expect(await stateOf(db)).toEqual(GRADED)
  })

  it('writes neither store when the card write fails', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)

    vi.spyOn(db.cards, 'put').mockRejectedValue(
      Object.assign(new Error('The quota has been exceeded.'), {
        name: 'QuotaExceededError',
      }),
    )

    await expect(repo.commitReview({ card: gradedCard(), log: log() })).rejects.toThrow(
      /quota/i,
    )
    expect(await stateOf(db)).toEqual(UNGRADED)
  })

  // The failure the audit actually found: the card advances, the log write
  // rejects, and the review becomes invisible to every stat while the card
  // behaves as though it happened.
  it('rolls the card update back when the log write fails after it', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)

    vi.spyOn(db.reviewLogs, 'add').mockRejectedValue(new Error('log store unavailable'))

    await expect(repo.commitReview({ card: gradedCard(), log: log() })).rejects.toThrow(
      /log store unavailable/,
    )
    expect(await stateOf(db)).toEqual(UNGRADED)
  })

  // `add` rather than `put` is what makes this a failure at all: re-committing
  // an id that is already recorded must abort rather than silently overwrite
  // history.
  it('rolls the whole scope back on a duplicate review log id', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)
    await db.reviewLogs.add(log())

    await expect(repo.commitReview({ card: gradedCard(), log: log() })).rejects.toThrow()
    // The pre-existing log survives untouched, and the card did not advance -
    // the whole scope rolled back rather than half-applying.
    expect(await stateOf(db)).toEqual({ ...UNGRADED, logIds: ['log-1', 'log-other'] })
  })

  it('leaves unrelated cards and history untouched on success and on failure', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)

    await repo.commitReview({ card: gradedCard(), log: log() })
    expect(await db.cards.get('card-other')).toEqual(OTHER_CARD)
    expect(await db.reviewLogs.get('log-other')).toEqual(OTHER_LOG)

    vi.spyOn(db.reviewLogs, 'add').mockRejectedValue(new Error('nope'))
    await expect(
      repo.commitReview({
        card: gradedCard(),
        log: fixtureReviewLog({ id: 'log-2', cardId: 'card-1' }),
      }),
    ).rejects.toThrow()
    expect(await db.cards.get('card-other')).toEqual(OTHER_CARD)
    expect(await db.reviewLogs.get('log-other')).toEqual(OTHER_LOG)
  })
})

describe('DexieRepository.revertReview', () => {
  it('restores the pre-grade card and removes exactly that log', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)
    await repo.commitReview({ card: gradedCard(), log: log() })

    await repo.revertReview({ card: beforeCard(), logId: 'log-1' })

    expect(await stateOf(db)).toEqual(UNGRADED)
    expect(await db.cards.get('card-1')).toEqual(beforeCard())
  })

  it('leaves the graded state fully intact when the log delete fails', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)
    await repo.commitReview({ card: gradedCard(), log: log() })

    vi.spyOn(db.reviewLogs, 'delete').mockRejectedValue(new Error('delete failed'))

    await expect(
      repo.revertReview({ card: beforeCard(), logId: 'log-1' }),
    ).rejects.toThrow(/delete failed/)

    // No partial reversal: the card must not be back at reps 0 while its log
    // still exists, which is the mirror image of the commit bug.
    expect(await stateOf(db)).toEqual(GRADED)
  })

  it('leaves the log in place when the card restore fails', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db)
    await repo.commitReview({ card: gradedCard(), log: log() })

    vi.spyOn(db.cards, 'put').mockRejectedValue(new Error('card write failed'))

    await expect(
      repo.revertReview({ card: beforeCard(), logId: 'log-1' }),
    ).rejects.toThrow(/card write failed/)
    expect(await stateOf(db)).toEqual(GRADED)
  })
})
