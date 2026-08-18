import { describe, it, expect } from 'vitest'
import type { Deck, ID, ReviewLog } from '@/types'
import { buildHistoryRange, buildReviewHistory } from './reviewHistory'

const DAY = 86_400_000

function log(overrides: Partial<ReviewLog>): ReviewLog {
  return {
    id: overrides.id ?? `log-${Math.random()}`,
    cardId: 'card-1',
    reviewedAt: Date.now(),
    rating: 3,
    autoGraded: false,
    durationMs: 1000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    state: 'review',
    ...overrides,
  }
}

function deck(id: string, parentId?: string): Deck {
  return { id, name: id, parentId, createdAt: 0, updatedAt: 0 } as Deck
}

function decksOf(...ids: [string, string?][]): Deck[] {
  return ids.map(([id, parentId]) => deck(id, parentId))
}

const noDecks: Deck[] = []
const noCards = new Map<ID, ID>()

describe('buildHistoryRange', () => {
  it('returns null for "all", meaning no date filter', () => {
    expect(buildHistoryRange('all')).toBeNull()
  })

  it('builds a bounded, exclusive-end window for the other presets', () => {
    const now = Date.parse('2026-08-18T12:00:00Z')
    const range = buildHistoryRange('30d', now)!
    expect(range.days).toBe(30)
    expect(range.to - range.from).toBe(30 * DAY)
    // `to` is the start of tomorrow, so anything logged today is included.
    expect(range.to).toBeGreaterThan(now)
  })
})

describe('buildReviewHistory', () => {
  it('sorts newest first', () => {
    const logs = [
      log({ id: 'old', reviewedAt: 100 }),
      log({ id: 'new', reviewedAt: 300 }),
      log({ id: 'mid', reviewedAt: 200 }),
    ]
    const rows = buildReviewHistory(logs, noCards, noDecks, { range: null })
    expect(rows.map((r) => r.id)).toEqual(['new', 'mid', 'old'])
  })

  it('breaks timestamp ties by id so paging is stable', () => {
    const logs = [log({ id: 'b', reviewedAt: 100 }), log({ id: 'a', reviewedAt: 100 })]
    const rows = buildReviewHistory(logs, noCards, noDecks, { range: null })
    expect(rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('includes a log exactly at range.from and excludes one exactly at range.to', () => {
    const range = { from: 1000, to: 2000, days: 1 }
    const logs = [
      log({ id: 'at-from', reviewedAt: 1000 }),
      log({ id: 'inside', reviewedAt: 1500 }),
      log({ id: 'at-to', reviewedAt: 2000 }),
      log({ id: 'before', reviewedAt: 999 }),
    ]
    const rows = buildReviewHistory(logs, noCards, noDecks, { range })
    expect(rows.map((r) => r.id).sort()).toEqual(['at-from', 'inside'])
  })

  it('applies no date filter when the range is null', () => {
    const logs = [log({ reviewedAt: 0 }), log({ reviewedAt: Date.now() })]
    expect(buildReviewHistory(logs, noCards, noDecks, { range: null })).toHaveLength(2)
  })

  it('filters by rating', () => {
    const logs = [
      log({ id: 'again', rating: 1 }),
      log({ id: 'good', rating: 3 }),
      log({ id: 'easy', rating: 4 }),
    ]
    const rows = buildReviewHistory(logs, noCards, noDecks, { range: null, rating: 1 })
    expect(rows.map((r) => r.id)).toEqual(['again'])
  })

  it('scopes to a deck and its descendants', () => {
    const decks = decksOf(['parent'], ['child', 'parent'], ['other'])
    const cardDecks = new Map<ID, ID>([
      ['in-parent', 'parent'],
      ['in-child', 'child'],
      ['elsewhere', 'other'],
    ])
    const logs = [
      log({ id: 'p', cardId: 'in-parent' }),
      log({ id: 'c', cardId: 'in-child' }),
      log({ id: 'o', cardId: 'elsewhere' }),
    ]
    const rows = buildReviewHistory(logs, cardDecks, decks, { range: null, deckId: 'parent' })
    expect(rows.map((r) => r.id).sort()).toEqual(['c', 'p'])
  })

  it('keeps reviews whose card no longer exists, with a null deck', () => {
    const rows = buildReviewHistory([log({ id: 'orphan', cardId: 'gone' })], noCards, noDecks, {
      range: null,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].deckId).toBeNull()
  })

  it('excludes reviews for deleted cards when a deck scope is applied', () => {
    const decks = decksOf(['deck-a'])
    const cardDecks = new Map<ID, ID>([['kept', 'deck-a']])
    const logs = [log({ id: 'kept', cardId: 'kept' }), log({ id: 'orphan', cardId: 'gone' })]
    const rows = buildReviewHistory(logs, cardDecks, decks, { range: null, deckId: 'deck-a' })
    expect(rows.map((r) => r.id)).toEqual(['kept'])
  })

  it('carries dueAfter through when present and leaves it undefined otherwise', () => {
    const logs = [
      log({ id: 'new-row', reviewedAt: 200, dueAfter: 200 + 3 * DAY }),
      log({ id: 'legacy', reviewedAt: 100 }),
    ]
    const rows = buildReviewHistory(logs, noCards, noDecks, { range: null })
    expect(rows[0].dueAfter).toBe(200 + 3 * DAY)
    expect(rows[1].dueAfter).toBeUndefined()
  })
})
