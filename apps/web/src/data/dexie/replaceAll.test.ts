import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card, Roadmap } from '@/types'
import {
  fixtureCard,
  fixtureDeck,
  fixtureDraft,
  fixtureReviewLog,
  fixtureRoadmap,
} from '@/domain/io/backupFixtures'
import type { WorkspaceSnapshot } from '../repository'
import { AppDB } from './db'
import { DexieRepository } from './DexieRepository'

// The regression suite for audit P1-1: a failed replace-import must leave the
// previous workspace exactly as it was. These run against the real Dexie
// transaction over fake-indexeddb - nothing about the transaction is mocked,
// because the transaction IS the thing under test.

const names: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})

function freshDb(): AppDB {
  const name = `itera-replace-${Date.now()}-${Math.random()}`
  names.push(name)
  return new AppDB(name)
}

// Workspace A: what the user already has. Every store is populated, so an
// unnoticed partial rollback in any one of them fails a test.
function workspaceA(): WorkspaceSnapshot {
  return {
    cards: [fixtureCard('recall', { id: 'a-card', deckId: 'a-deck' })],
    decks: [fixtureDeck({ id: 'a-deck', name: 'PRIOR USER DECK' })],
    drafts: [fixtureDraft({ id: 'a-draft' })],
    reviewLogs: [fixtureReviewLog({ id: 'a-log', cardId: 'a-card' })],
    roadmaps: [fixtureRoadmap({ id: 'a-roadmap' })],
  }
}

// Workspace B: the incoming file, sharing no id with A.
function workspaceB(): WorkspaceSnapshot {
  return {
    cards: [fixtureCard('ordering', { id: 'b-card', deckId: 'b-deck' })],
    decks: [fixtureDeck({ id: 'b-deck', name: 'INCOMING DECK' })],
    drafts: [fixtureDraft({ id: 'b-draft' })],
    reviewLogs: [fixtureReviewLog({ id: 'b-log', cardId: 'b-card' })],
    roadmaps: [fixtureRoadmap({ id: 'b-roadmap' })],
  }
}

async function seed(db: AppDB, snapshot: WorkspaceSnapshot): Promise<void> {
  await db.cards.bulkPut(snapshot.cards)
  await db.decks.bulkPut(snapshot.decks)
  await db.drafts.bulkPut(snapshot.drafts)
  await db.reviewLogs.bulkPut(snapshot.reviewLogs)
  await db.roadmaps.bulkPut(snapshot.roadmaps)
}

// Actual persisted state, every store, so a test proves storage rather than
// proving that a promise rejected.
async function idsIn(db: AppDB): Promise<Record<string, string[]>> {
  const sorted = (rows: { id: string }[]) => rows.map((r) => r.id).sort()
  return {
    cards: sorted(await db.cards.toArray()),
    decks: sorted(await db.decks.toArray()),
    drafts: sorted(await db.drafts.toArray()),
    reviewLogs: sorted(await db.reviewLogs.toArray()),
    roadmaps: sorted(await db.roadmaps.toArray()),
  }
}

const A_IDS = {
  cards: ['a-card'],
  decks: ['a-deck'],
  drafts: ['a-draft'],
  reviewLogs: ['a-log'],
  roadmaps: ['a-roadmap'],
}

describe('DexieRepository.replaceAll — success', () => {
  it('replaces every store with the incoming workspace', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    await repo.replaceAll(workspaceB())

    expect(await idsIn(db)).toEqual({
      cards: ['b-card'],
      decks: ['b-deck'],
      drafts: ['b-draft'],
      reviewLogs: ['b-log'],
      roadmaps: ['b-roadmap'],
    })
  })

  it('declares itself transactional', () => {
    expect(new DexieRepository(freshDb()).importGuarantee).toBe('transactional')
  })
})

describe('DexieRepository.replaceAll — failure leaves the previous workspace intact', () => {
  // The audit's exact trigger: an entity IndexedDB cannot key. parseBackup now
  // rejects this shape, so reaching replaceAll with it means bypassing
  // validation - which is the point. Even then, nothing may be lost.
  it('rolls back a failure in the last store written (roadmaps)', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    const incoming = workspaceB()
    incoming.roadmaps = [{ title: 'no id here' } as unknown as Roadmap]

    await expect(repo.replaceAll(incoming)).rejects.toThrow()
    expect(await idsIn(db)).toEqual(A_IDS)
  })

  // Same guarantee at the other end of the write order, so atomicity cannot be
  // an accident of which store happened to fail.
  it('rolls back a failure in the first store written (cards)', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    const incoming = workspaceB()
    incoming.cards = [{ prompt: 'no id here' } as unknown as Card]

    await expect(repo.replaceAll(incoming)).rejects.toThrow()
    expect(await idsIn(db)).toEqual(A_IDS)
  })

  // Stands in for the failures validation can never prevent: quota exhaustion,
  // a disk error, a browser killing the connection mid-write.
  it('rolls back a non-IndexedDB failure raised mid-write', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    vi.spyOn(db.drafts, 'bulkPut').mockRejectedValue(
      Object.assign(new Error('The quota has been exceeded.'), {
        name: 'QuotaExceededError',
      }),
    )

    await expect(repo.replaceAll(workspaceB())).rejects.toThrow(/quota/i)
    expect(await idsIn(db)).toEqual(A_IDS)
  })

  it('preserves the previous workspace with a completely empty incoming file', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    // An empty replace is legitimate and must actually empty the workspace -
    // the rollback tests above must not be passing because nothing is written.
    await repo.replaceAll({ cards: [], decks: [], drafts: [], reviewLogs: [], roadmaps: [] })

    expect(await idsIn(db)).toEqual({
      cards: [],
      decks: [],
      drafts: [],
      reviewLogs: [],
      roadmaps: [],
    })
  })
})

describe('DexieRepository.mergeAll', () => {
  it('upserts the incoming workspace over the existing one', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    await repo.mergeAll(workspaceB())

    expect(await idsIn(db)).toEqual({
      cards: ['a-card', 'b-card'],
      decks: ['a-deck', 'b-deck'],
      drafts: ['a-draft', 'b-draft'],
      reviewLogs: ['a-log', 'b-log'],
      roadmaps: ['a-roadmap', 'b-roadmap'],
    })
  })

  it('writes nothing at all when part of the merge fails', async () => {
    const db = freshDb()
    const repo = new DexieRepository(db)
    await seed(db, workspaceA())

    const incoming = workspaceB()
    incoming.roadmaps = [{ title: 'no id here' } as unknown as Roadmap]

    await expect(repo.mergeAll(incoming)).rejects.toThrow()
    expect(await idsIn(db)).toEqual(A_IDS)
  })
})
