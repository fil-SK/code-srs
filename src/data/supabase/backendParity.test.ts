import { beforeEach, describe, expect, it } from 'vitest'
import type { Card, ReviewLog } from '@/types'
import { richText } from '@/types/card'
import { fixtureCard, fixtureReviewLog } from '@/domain/io/backupFixtures'
import { AppDB } from '../dexie/db'
import { DexieRepository } from '../dexie/DexieRepository'
import { SupabaseRepository } from '@itera/core'
// The fake server moved into @itera/core with the backend it models, and is
// deliberately not on the package barrel - a test double has no business on a
// production surface. This one test needs both backends at once, so it is the
// single place that reaches past the barrel to a source path.
import {
  cardRow,
  fakeSupabase,
  reviewLogRow,
} from '@itera/core/src/data/supabase/fakeSupabaseClient'

// The seam's standing promise is that the backend is invisible: the same stored
// data yields the same results either way (CURRENT_STATE.md section 12). Audit
// P1-4 broke that promise in the one direction no error surfaces - Supabase
// returned a prefix. These read the identical dataset through a real
// DexieRepository and through a Supabase repository whose every response is
// capped at three rows, and compare the results outright.
//
// One divergence is deliberately kept out of the way: getDue's server-side
// `.eq('suspended', false)` skips rows whose `suspended` key is absent, where
// Dexie treats a missing key as not suspended. That is the audit's separate P3
// finding, so every card here sets `suspended` explicitly rather than having
// this suite quietly assert either behaviour.

const CAP = 3

const db = new AppDB()
const dexie = new DexieRepository(db)

function pad(i: number): string {
  return String(i).padStart(3, '0')
}

const TAGS = [['os'], ['cpp'], ['os', 'cpp'], []]

function dataset(): { cards: Card[]; logs: ReviewLog[] } {
  const cards = Array.from({ length: 11 }, (_, i) =>
    fixtureCard(i % 3 === 0 ? 'multiple_choice' : 'recall', {
      id: `card-${pad(i)}`,
      deckId: i % 2 === 0 ? 'deck-a' : 'deck-b',
      tags: TAGS[i % TAGS.length],
      suspended: i === 4,
      // Two pairs share an updatedAt, so the comparison covers tie ordering and
      // not just distinct keys.
      updatedAt: 1_000 + Math.floor(i / 2),
      prompt: richText(i % 5 === 0 ? 'What is a mutex?' : `Question about pointers ${i}`),
      scheduling: { ...fixtureCard().scheduling, due: 500 - i },
    }),
  )

  const logs = Array.from({ length: 11 }, (_, i) =>
    fixtureReviewLog({
      id: `log-${pad(i)}`,
      cardId: `card-${pad(i)}`,
      // Duplicated timestamps land on both sides of a page boundary.
      reviewedAt: 2_000 + Math.floor(i / 3),
    }),
  )

  return { cards, logs }
}

function cloud() {
  const { cards, logs } = dataset()
  const { sb } = fakeSupabase({
    tables: { cards: cards.map(cardRow), review_logs: logs.map(reviewLogRow) },
    maxRows: CAP,
  })
  return new SupabaseRepository(sb)
}

beforeEach(async () => {
  const { cards, logs } = dataset()
  await Promise.all([db.cards.clear(), db.reviewLogs.clear()])
  await dexie.cards.bulkPut(cards)
  await dexie.reviews.bulkPut(logs)
})

describe('Dexie / Supabase parity — card search', () => {
  const queries = [
    { name: 'everything', query: {} },
    { name: 'free text', query: { text: 'mutex' } },
    { name: 'text that matches nothing', query: { text: 'segfault' } },
    { name: 'one deck', query: { deckId: 'deck-b' } },
    { name: 'one tag', query: { tags: ['cpp'] } },
    { name: 'one interaction type', query: { types: ['multiple_choice' as const] } },
    { name: 'suspended included', query: { includeSuspended: true } },
    { name: 'deck plus tag plus text', query: { deckId: 'deck-a', tags: ['os'], text: 'pointers' } },
  ]

  for (const { name, query } of queries) {
    it(`agrees on ${name}`, async () => {
      const local = await dexie.cards.search(query)
      const remote = await cloud().cards.search(query)

      expect(remote).toEqual(local)
      expect(remote.length).toBeGreaterThanOrEqual(0)
    })
  }

  it('reads more rows than one capped response can carry', async () => {
    // Without this the parity above could hold simply because nothing paged.
    expect((await dexie.cards.search({ includeSuspended: true })).length).toBeGreaterThan(CAP)
  })
})

describe('Dexie / Supabase parity — due cards', () => {
  const queries = [
    { name: 'all due now', query: { now: 1_000 } },
    { name: 'a due window that excludes later cards', query: { now: 495 } },
    { name: 'one deck', query: { now: 1_000, deckId: 'deck-a' } },
    { name: 'one tag', query: { now: 1_000, tags: ['os'] } },
    { name: 'an explicit limit', query: { now: 1_000, limit: 4 } },
    { name: 'a limit inside one deck', query: { now: 1_000, deckId: 'deck-b', limit: 3 } },
  ]

  for (const { name, query } of queries) {
    it(`agrees on ${name}`, async () => {
      const local = await dexie.cards.getDue(query)
      const remote = await cloud().cards.getDue(query)

      expect(remote).toEqual(local)
    })
  }
})

describe('Dexie / Supabase parity — review ranges', () => {
  const queries: [string, number, number][] = [
    ['the whole history', 0, 9_999],
    ['an inner window', 2_001, 2_002],
    ['a single timestamp shared by several logs', 2_001, 2_001],
    ['both boundaries inclusive', 2_000, 2_003],
    ['an empty window', 3_000, 4_000],
  ]

  for (const [name, from, to] of queries) {
    it(`agrees on ${name}`, async () => {
      const local = await dexie.reviews.range(from, to)
      const remote = await cloud().reviews.range(from, to)

      expect(remote).toEqual(local)
    })
  }

  it('agrees on one card entire history', async () => {
    expect(await cloud().reviews.forCard('card-005')).toEqual(
      await dexie.reviews.forCard('card-005'),
    )
  })

  it('agrees on the complete log list', async () => {
    expect(await cloud().reviews.all()).toEqual(await dexie.reviews.all())
  })
})
