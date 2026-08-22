import { describe, expect, it } from 'vitest'
import type { Card, ReviewLog } from '@/types'
import { fixtureCard, fixtureDeck, fixtureReviewLog } from '@/domain/io/backupFixtures'
import { richText } from '@/types/card'
import {
  cardRow,
  entityRow,
  fakeSupabase,
  rangesOf,
  reviewLogRow,
  selectsOn,
  type FakeRow,
} from './fakeSupabaseClient'
import { SupabaseRepository } from './SupabaseRepository'

// Audit P1-4. PostgREST answers an oversized select with a 200 carrying only the
// first "Max rows" rows, so a single successful request is not a complete read.
// Every collection read here must page to completion.
//
// The fake's `maxRows` is deliberately far below the repository's internal page
// size, which is the case that breaks the obvious implementation: if the loop
// stopped at the first page shorter than the one it asked for, it would stop on
// page one of every query, on every project whose cap is lower than the page
// size. The recorded ranges are the proof it advances by rows *received*.

const CAP = 3

function pad(i: number): string {
  return String(i).padStart(3, '0')
}

function deckRows(n: number): FakeRow[] {
  return Array.from({ length: n }, (_, i) =>
    entityRow(fixtureDeck({ id: `deck-${pad(i)}`, name: `Deck ${i}` })),
  )
}

function logRows(n: number, overrides: (i: number) => Partial<ReviewLog> = () => ({})): FakeRow[] {
  return Array.from({ length: n }, (_, i) =>
    reviewLogRow(fixtureReviewLog({ id: `log-${pad(i)}`, reviewedAt: 1_000 + i, ...overrides(i) })),
  )
}

function ids(entities: { id: string }[]): string[] {
  return entities.map((e) => e.id)
}

describe('SupabaseRepository — pagination edge cases', () => {
  // Everything below reads through crud.getAll, the shape decks, drafts,
  // roadmaps and cards all share.
  async function readDecks(rowCount: number, reportCount = true) {
    const { sb, requests } = fakeSupabase({
      tables: { decks: deckRows(rowCount) },
      maxRows: CAP,
      reportCount,
    })
    const decks = await new SupabaseRepository(sb).decks.getAll()
    return { decks, requests }
  }

  it('returns nothing, in one request, for an empty table', async () => {
    const { decks, requests } = await readDecks(0)
    expect(decks).toEqual([])
    expect(rangesOf(requests, 'decks')).toEqual(['0-499'])
  })

  it('reads a table smaller than one page in one request', async () => {
    const { decks, requests } = await readDecks(2)
    expect(ids(decks)).toEqual(['deck-000', 'deck-001'])
    expect(rangesOf(requests, 'decks')).toEqual(['0-499'])
  })

  it('reads exactly one full page without asking for a second', async () => {
    const { decks, requests } = await readDecks(CAP)
    expect(decks).toHaveLength(CAP)
    expect(rangesOf(requests, 'decks')).toEqual(['0-499'])
  })

  it('follows a full page with the partial page after it', async () => {
    const { decks, requests } = await readDecks(5)
    expect(ids(decks)).toEqual(['deck-000', 'deck-001', 'deck-002', 'deck-003', 'deck-004'])
    // The second window starts at 3, not 500: the loop advances by the rows it
    // actually received, never by the size it asked for.
    expect(rangesOf(requests, 'decks')).toEqual(['0-499', '3-502'])
  })

  it('reads several full pages plus a partial final page', async () => {
    const { decks, requests } = await readDecks(8)
    expect(ids(decks)).toEqual(Array.from({ length: 8 }, (_, i) => `deck-${pad(i)}`))
    expect(rangesOf(requests, 'decks')).toEqual(['0-499', '3-502', '6-505'])
  })

  // The case a "stop on a short page" loop gets wrong in the other direction:
  // there is no short page to stop on.
  it('reads an exact multiple of the server cap without stopping a page early', async () => {
    const { decks, requests } = await readDecks(9)
    expect(decks).toHaveLength(9)
    expect(rangesOf(requests, 'decks')).toEqual(['0-499', '3-502', '6-505'])
  })

  it('asks for the exact count, which is what lets it stop on an exact multiple', async () => {
    const { requests } = await readDecks(9)
    expect(selectsOn(requests, 'decks').every((r) => r.count === 'exact')).toBe(true)
  })

  it('still terminates on an exact multiple when no count comes back, at the cost of one empty request', async () => {
    const { decks, requests } = await readDecks(9, false)
    expect(decks).toHaveLength(9)
    expect(rangesOf(requests, 'decks')).toEqual(['0-499', '3-502', '6-505', '9-508'])
  })

  it('reads a multi-page table completely with no count to guide it', async () => {
    const { decks } = await readDecks(8, false)
    expect(decks).toHaveLength(8)
  })

  it('orders by the primary key so page boundaries are deterministic', async () => {
    const { requests } = await readDecks(8)
    expect(selectsOn(requests, 'decks')[0].order).toEqual([{ column: 'id', ascending: true }])
  })

  it('rejects when a later page fails instead of resolving with the pages before it', async () => {
    const { sb } = fakeSupabase({
      tables: { decks: deckRows(9) },
      maxRows: CAP,
      failSelectAt: 2,
    })

    await expect(new SupabaseRepository(sb).decks.getAll()).rejects.toThrow(/failed/)
  })

  it('stops requesting once a page fails', async () => {
    const { sb, requests } = fakeSupabase({
      tables: { decks: deckRows(9) },
      maxRows: CAP,
      failSelectAt: 2,
    })

    await new SupabaseRepository(sb).decks.getAll().catch(() => undefined)
    expect(rangesOf(requests, 'decks')).toEqual(['0-499', '3-502'])
  })

  it('leaves the single-row read unpaginated', async () => {
    const { sb, requests } = fakeSupabase({ tables: { decks: deckRows(5) }, maxRows: CAP })

    expect((await new SupabaseRepository(sb).decks.getById('deck-003'))?.id).toBe('deck-003')
    const select = selectsOn(requests, 'decks')[0]
    expect(select.single).toBe(true)
    expect(select.range).toBeUndefined()
  })
})

describe('SupabaseRepository — every entity list is complete', () => {
  it('pages decks, drafts, roadmaps and cards alike', async () => {
    const { sb } = fakeSupabase({
      tables: {
        decks: deckRows(7),
        drafts: deckRows(7).map((r) => ({ ...r })),
        roadmaps: deckRows(7).map((r) => ({ ...r })),
        cards: Array.from({ length: 7 }, (_, i) =>
          cardRow(fixtureCard('recall', { id: `card-${pad(i)}` })),
        ),
      },
      maxRows: CAP,
    })
    const repo = new SupabaseRepository(sb)

    expect(await repo.decks.getAll()).toHaveLength(7)
    expect(await repo.drafts.getAll()).toHaveLength(7)
    expect(await repo.roadmaps.getAll()).toHaveLength(7)
    expect(await repo.cards.getAll()).toHaveLength(7)
  })
})

describe('SupabaseRepository — review logs at scale', () => {
  it('returns every log from reviews.all across pages', async () => {
    const { sb, requests } = fakeSupabase({
      tables: { review_logs: logRows(8) },
      maxRows: CAP,
    })

    const all = await new SupabaseRepository(sb).reviews.all()
    expect(ids(all)).toEqual(Array.from({ length: 8 }, (_, i) => `log-${pad(i)}`))
    expect(rangesOf(requests, 'review_logs')).toEqual(['0-499', '3-502', '6-505'])
  })

  it('returns one card entire history in ascending review order', async () => {
    // Interleaved with another card's logs, so the server-side filter is doing
    // real work and the page offsets apply to the filtered set.
    const rows = Array.from({ length: 14 }, (_, i) =>
      reviewLogRow(
        fixtureReviewLog({
          id: `log-${pad(i)}`,
          cardId: i % 2 === 0 ? 'card-a' : 'card-b',
          reviewedAt: 2_000 - i,
        }),
      ),
    )
    const { sb, requests } = fakeSupabase({ tables: { review_logs: rows }, maxRows: CAP })

    const history = await new SupabaseRepository(sb).reviews.forCard('card-a')

    expect(history).toHaveLength(7)
    expect(history.every((l) => l.cardId === 'card-a')).toBe(true)
    expect(history.map((l) => l.reviewedAt)).toEqual([1_988, 1_990, 1_992, 1_994, 1_996, 1_998, 2_000])
    expect(rangesOf(requests, 'review_logs')).toEqual(['0-499', '3-502', '6-505'])
    expect(selectsOn(requests, 'review_logs')[0].filters).toEqual([
      { op: 'eq', column: 'card_id', value: 'card-a' },
    ])
  })

  it('breaks ties on a unique key so duplicate timestamps are neither lost nor repeated', async () => {
    // Every log shares one reviewedAt, so the sort key alone cannot order them
    // and offset paging would be free to shuffle rows between pages.
    const rows = logRows(9, () => ({ reviewedAt: 5_000 }))
    const { sb, requests } = fakeSupabase({ tables: { review_logs: rows }, maxRows: CAP })

    const history = await new SupabaseRepository(sb).reviews.forCard('card-recall')

    expect(ids(history)).toEqual(Array.from({ length: 9 }, (_, i) => `log-${pad(i)}`))
    expect(new Set(ids(history)).size).toBe(9)
    expect(selectsOn(requests, 'review_logs')[0].order).toEqual([
      { column: 'reviewed_at', ascending: true },
      { column: 'id', ascending: true },
    ])
  })

  it('returns every log inside a timestamp range and none outside it', async () => {
    // reviewedAt 1000..1013; the window keeps 1004..1011 inclusive.
    const { sb, requests } = fakeSupabase({
      tables: { review_logs: logRows(14) },
      maxRows: CAP,
    })

    const window = await new SupabaseRepository(sb).reviews.range(1_004, 1_011)

    expect(window.map((l) => l.reviewedAt)).toEqual([
      1_004, 1_005, 1_006, 1_007, 1_008, 1_009, 1_010, 1_011,
    ])
    expect(rangesOf(requests, 'review_logs')).toEqual(['0-499', '3-502', '6-505'])
  })

  it('keeps both range boundaries inclusive', async () => {
    const { sb } = fakeSupabase({ tables: { review_logs: logRows(14) }, maxRows: CAP })
    const window = await new SupabaseRepository(sb).reviews.range(1_000, 1_013)
    expect(window).toHaveLength(14)
  })

  it('keeps duplicate timestamps that straddle a range page boundary', async () => {
    const rows = logRows(9, (i) => ({ reviewedAt: i < 6 ? 5_000 : 6_000 }))
    const { sb } = fakeSupabase({ tables: { review_logs: rows }, maxRows: CAP })

    const window = await new SupabaseRepository(sb).reviews.range(5_000, 6_000)
    expect(ids(window)).toEqual(Array.from({ length: 9 }, (_, i) => `log-${pad(i)}`))
  })
})

describe('SupabaseRepository — cards.getDue across pages', () => {
  // 12 cards due at ascending times, alternating between two decks, plus one
  // suspended card that is due and must never appear.
  function dueTable(): FakeRow[] {
    const rows = Array.from({ length: 12 }, (_, i) =>
      cardRow(
        fixtureCard('recall', {
          id: `card-${pad(i)}`,
          deckId: i % 3 === 0 ? 'deck-b' : 'deck-a',
          tags: i % 2 === 0 ? ['os'] : ['cpp'],
          scheduling: { ...fixtureCard().scheduling, due: 100 + i },
        }),
      ),
    )
    rows.push(
      cardRow(
        fixtureCard('recall', {
          id: 'card-suspended',
          suspended: true,
          scheduling: { ...fixtureCard().scheduling, due: 100 },
        }),
      ),
    )
    return rows
  }

  it('returns every due card, in due order, across pages', async () => {
    const { sb, requests } = fakeSupabase({ tables: { cards: dueTable() }, maxRows: CAP })

    const due = await new SupabaseRepository(sb).cards.getDue({ now: 200 })

    expect(due).toHaveLength(12)
    expect(due.map((c) => c.scheduling.due)).toEqual(
      Array.from({ length: 12 }, (_, i) => 100 + i),
    )
    expect(rangesOf(requests, 'cards')).toEqual(['0-499', '3-502', '6-505', '9-508'])
  })

  it('keeps suspended cards out and pushes the due window to the server', async () => {
    const { sb, requests } = fakeSupabase({ tables: { cards: dueTable() }, maxRows: CAP })

    const due = await new SupabaseRepository(sb).cards.getDue({ now: 104 })

    expect(ids(due)).toEqual(['card-000', 'card-001', 'card-002', 'card-003', 'card-004'])
    expect(selectsOn(requests, 'cards')[0].filters).toEqual([
      { op: 'eq', column: 'suspended', value: false },
      { op: 'lte', column: 'due', value: 104 },
    ])
    expect(selectsOn(requests, 'cards')[0].order).toEqual([
      { column: 'due', ascending: true },
      { column: 'id', ascending: true },
    ])
  })

  it('filters by deck across every page, not just the first', async () => {
    const { sb } = fakeSupabase({ tables: { cards: dueTable() }, maxRows: CAP })

    const due = await new SupabaseRepository(sb).cards.getDue({ now: 200, deckId: 'deck-b' })

    expect(ids(due)).toEqual(['card-000', 'card-003', 'card-006', 'card-009'])
  })

  it('filters by tag across every page', async () => {
    const { sb } = fakeSupabase({ tables: { cards: dueTable() }, maxRows: CAP })

    const due = await new SupabaseRepository(sb).cards.getDue({ now: 200, tags: ['cpp'] })

    expect(ids(due)).toEqual(['card-001', 'card-003', 'card-005', 'card-007', 'card-009', 'card-011'])
  })

  // The trap in applying an Itera limit to raw pages: deck-b's cards are one in
  // every three, so the first page of raw rows contains a single match. A loop
  // that stopped once it had `limit` rows would return one card, or none.
  it('applies limit to the filtered result, not to a page of raw rows', async () => {
    const { sb } = fakeSupabase({ tables: { cards: dueTable() }, maxRows: CAP })

    const due = await new SupabaseRepository(sb).cards.getDue({
      now: 200,
      deckId: 'deck-b',
      limit: 3,
    })

    expect(ids(due)).toEqual(['card-000', 'card-003', 'card-006'])
  })
})

describe('SupabaseRepository — cards.search across pages', () => {
  // Only the last two cards match "mutex", and by id order they land on the
  // final page. A search that stopped early would report no results at all.
  function searchTable(): FakeRow[] {
    return Array.from({ length: 10 }, (_, i) => {
      const match = i >= 8
      const card: Card = fixtureCard('recall', {
        id: `card-${pad(i)}`,
        deckId: i % 2 === 0 ? 'deck-a' : 'deck-b',
        tags: match ? ['concurrency'] : ['os'],
        updatedAt: 1_000 + i,
        prompt: richText(match ? 'What is a mutex?' : `Question ${i}`),
      })
      return cardRow(card)
    })
  }

  it('finds matches that exist only on a later page', async () => {
    const { sb, requests } = fakeSupabase({ tables: { cards: searchTable() }, maxRows: CAP })

    const found = await new SupabaseRepository(sb).cards.search({ text: 'mutex' })

    expect(ids(found)).toEqual(['card-009', 'card-008'])
    expect(rangesOf(requests, 'cards')).toEqual(['0-499', '3-502', '6-505', '9-508'])
  })

  it('finds tag matches that exist only on a later page', async () => {
    const { sb } = fakeSupabase({ tables: { cards: searchTable() }, maxRows: CAP })
    const found = await new SupabaseRepository(sb).cards.search({ tags: ['concurrency'] })
    expect(ids(found)).toEqual(['card-009', 'card-008'])
  })

  it('sorts the complete result by updatedAt descending', async () => {
    const { sb } = fakeSupabase({ tables: { cards: searchTable() }, maxRows: CAP })

    const found = await new SupabaseRepository(sb).cards.search({})

    expect(found).toHaveLength(10)
    expect(found.map((c) => c.updatedAt)).toEqual(
      Array.from({ length: 10 }, (_, i) => 1_009 - i),
    )
  })

  it('applies deck, type and suspension filters to the whole candidate set', async () => {
    const rows = searchTable()
    rows.push(
      cardRow(fixtureCard('multiple_choice', { id: 'card-020', suspended: true, updatedAt: 2_000 })),
      cardRow(fixtureCard('multiple_choice', { id: 'card-021', updatedAt: 2_001 })),
    )
    const { sb } = fakeSupabase({ tables: { cards: rows }, maxRows: CAP })
    const repo = new SupabaseRepository(sb)

    expect(ids(await repo.cards.search({ types: ['multiple_choice'] }))).toEqual(['card-021'])
    expect(ids(await repo.cards.search({ types: ['multiple_choice'], includeSuspended: true })))
      .toEqual(['card-021', 'card-020'])
    expect(await repo.cards.search({ deckId: 'deck-b' })).toHaveLength(5)
  })

  it('orders the paged candidate set by id and asks for the exact count', async () => {
    const { sb, requests } = fakeSupabase({ tables: { cards: searchTable() }, maxRows: CAP })
    await new SupabaseRepository(sb).cards.search({})

    const first = selectsOn(requests, 'cards')[0]
    expect(first.order).toEqual([{ column: 'id', ascending: true }])
    expect(first.filters).toEqual([])
    expect(first.count).toBe('exact')
  })

  it('rejects rather than returning a partial result set when a page fails', async () => {
    const { sb } = fakeSupabase({
      tables: { cards: searchTable() },
      maxRows: CAP,
      failSelectAt: 3,
    })

    await expect(new SupabaseRepository(sb).cards.search({})).rejects.toThrow(/failed/)
  })
})
