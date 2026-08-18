import { describe, it, expect } from 'vitest'
import type { Card, ReviewLog } from '@/types'
import { buildRange } from './dateRange'
import { buildCardDeckMap } from './cardDeckIndex'
import {
  clusterSessions,
  computeKpis,
  computeHeatmap,
  computeRetentionSeries,
  computeDeckPerformance,
  deriveMilestones,
} from './progressMetrics'

const DAY = 86_400_000
const MIN = 60_000

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

function card(overrides: Partial<Card>): Card {
  return {
    id: overrides.id ?? 'card-1',
    deckId: 'deck-1',
    type: 'recall',
    content: {} as never,
    scheduling: {
      due: Date.now(),
      stability: 1,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 1,
      lapses: 0,
      learningSteps: 0,
      state: 'review',
    },
    suspended: false,
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  } as unknown as Card
}

describe('clusterSessions', () => {
  it('groups reviews within the gap threshold into one session', () => {
    const t0 = Date.now()
    const logs = [
      log({ reviewedAt: t0 }),
      log({ reviewedAt: t0 + 5 * MIN }),
      log({ reviewedAt: t0 + 10 * MIN }),
    ]
    expect(clusterSessions(logs)).toHaveLength(1)
  })

  it('splits into separate sessions when the gap exceeds the threshold', () => {
    const t0 = Date.now()
    const logs = [log({ reviewedAt: t0 }), log({ reviewedAt: t0 + 40 * MIN })]
    const sessions = clusterSessions(logs)
    expect(sessions).toHaveLength(2)
    expect(sessions[0].reviewCount).toBe(1)
    expect(sessions[1].reviewCount).toBe(1)
  })

  it('returns an empty array for no logs', () => {
    expect(clusterSessions([])).toEqual([])
  })
})

describe('computeKpis', () => {
  it('computes cardsReviewed and a positive delta vs a smaller previous period', () => {
    const now = Date.now()
    const range = buildRange('7d', now)
    const logs = [
      // 2 reviews in the current 7d window
      log({ reviewedAt: now - DAY, rating: 3 }),
      log({ reviewedAt: now - 2 * DAY, rating: 3 }),
      // 1 review in the previous window
      log({ reviewedAt: now - 10 * DAY, rating: 3 }),
    ]
    const kpis = computeKpis(logs, range, now)
    expect(kpis.cardsReviewed.value).toBe(2)
    expect(kpis.cardsReviewed.deltaPct).toBe(100)
  })

  it('returns null retention/accuracy when there are no reviews in range', () => {
    const range = buildRange('7d')
    const kpis = computeKpis([], range)
    expect(kpis.retention.value).toBeNull()
    expect(kpis.accuracy.value).toBeNull()
    expect(kpis.streak).toBe(0)
  })

  it('computes streak counting back from today with a one-day grace', () => {
    const now = Date.now()
    const range = buildRange('30d', now)
    const logs = [
      log({ reviewedAt: now - DAY }),
      log({ reviewedAt: now - 2 * DAY }),
      log({ reviewedAt: now - 3 * DAY }),
    ]
    const kpis = computeKpis(logs, range, now)
    expect(kpis.streak).toBe(3)
    expect(kpis.bestStreak).toBe(3)
  })
})

describe('computeHeatmap', () => {
  it('returns one entry per day and marks the max day at the top level', () => {
    const now = Date.now()
    const logs = [log({ reviewedAt: now }), log({ reviewedAt: now }), log({ reviewedAt: now - DAY })]
    const days = computeHeatmap(logs, 7, now)
    expect(days).toHaveLength(7)
    const today = days[days.length - 1]
    expect(today.count).toBe(2)
    expect(today.level).toBe(4)
  })

  it('gives zero-count days level 0', () => {
    const days = computeHeatmap([], 7)
    expect(days.every((d) => d.level === 0 && d.count === 0)).toBe(true)
  })
})

describe('computeRetentionSeries', () => {
  it('buckets the range and computes per-bucket retention', () => {
    const now = Date.now()
    const range = buildRange('7d', now)
    const logs = [
      log({ reviewedAt: now - DAY, rating: 3, state: 'review' }),
      log({ reviewedAt: now - DAY, rating: 1, state: 'review' }),
    ]
    const series = computeRetentionSeries(logs, range, new Map())
    const total = series.reduce((sum, p) => sum + (p.retention !== null ? 1 : 0), 0)
    expect(total).toBeGreaterThan(0)
  })

  it('scopes to a single deck via the cardId -> deckId join', () => {
    const now = Date.now()
    const range = buildRange('7d', now)
    const cards = [card({ id: 'a', deckId: 'deck-a' }), card({ id: 'b', deckId: 'deck-b' })]
    const logs = [
      log({ cardId: 'a', reviewedAt: now - DAY, rating: 3, state: 'review' }),
      log({ cardId: 'b', reviewedAt: now - DAY, rating: 1, state: 'review' }),
    ]
    const series = computeRetentionSeries(logs, range, buildCardDeckMap(cards, []), 'deck-a')
    const bucketWithData = series.find((p) => p.retention !== null)
    expect(bucketWithData?.retention).toBe(1)
  })
})

describe('computeDeckPerformance', () => {
  it('joins reviews to decks and excludes logs for deleted cards', () => {
    const now = Date.now()
    const range = buildRange('7d', now)
    const cards = [card({ id: 'a', deckId: 'deck-a' })]
    const logs = [
      log({ cardId: 'a', reviewedAt: now - DAY, rating: 3, state: 'review' }),
      log({ cardId: 'a', reviewedAt: now - DAY, rating: 3, state: 'review' }),
      log({ cardId: 'deleted-card', reviewedAt: now - DAY, rating: 3, state: 'review' }),
    ]
    const rows = computeDeckPerformance(logs, buildCardDeckMap(cards, []), range)
    expect(rows).toHaveLength(1)
    expect(rows[0].deckId).toBe('deck-a')
    expect(rows[0].reviewed).toBe(2)
    expect(rows[0].retention).toBe(1)
  })

  // A legacy card edited in the Recall editor loses its `cards` row and gains a
  // `cardsV2` one under the same id. Attribution used to be v1-only, so those
  // cards' reviews silently vanished from this table.
  it('attributes reviews for a card that now lives only in the v2 store', () => {
    const now = Date.now()
    const range = buildRange('7d', now)
    const cardsV2 = [
      { id: 'a', deckId: 'deck-a' } as unknown as import('@/types/cardV2').CardV2Record,
    ]
    const logs = [
      log({ cardId: 'a', reviewedAt: now - DAY, rating: 3, state: 'review' }),
      log({ cardId: 'a', reviewedAt: now - DAY, rating: 3, state: 'review' }),
    ]
    const rows = computeDeckPerformance(logs, buildCardDeckMap([], cardsV2), range)
    expect(rows).toHaveLength(1)
    expect(rows[0].deckId).toBe('deck-a')
    expect(rows[0].reviewed).toBe(2)
  })

  it('sorts rows by reviewed count descending', () => {
    const now = Date.now()
    const range = buildRange('7d', now)
    const cards = [card({ id: 'a', deckId: 'deck-a' }), card({ id: 'b', deckId: 'deck-b' })]
    const logs = [
      log({ cardId: 'a', reviewedAt: now - DAY }),
      log({ cardId: 'b', reviewedAt: now - DAY }),
      log({ cardId: 'b', reviewedAt: now - DAY }),
    ]
    const rows = computeDeckPerformance(logs, buildCardDeckMap(cards, []), range)
    expect(rows[0].deckId).toBe('deck-b')
    expect(rows[0].reviewed).toBe(2)
  })
})

describe('deriveMilestones', () => {
  it('returns no events for an empty history', () => {
    expect(deriveMilestones([])).toEqual([])
  })

  it('detects a 3-day streak milestone dated on the third consecutive day', () => {
    const now = Date.now()
    const logs = [
      log({ reviewedAt: now - 2 * DAY }),
      log({ reviewedAt: now - DAY }),
      log({ reviewedAt: now }),
    ]
    const events = deriveMilestones(logs)
    const streak3 = events.find((e) => e.type === 'streak' && e.threshold === 3)
    expect(streak3).toBeDefined()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    expect(streak3?.date).toBe(today.getTime())
  })

  it('detects a cumulative review-count milestone at the Nth review', () => {
    const now = Date.now()
    const logs = Array.from({ length: 100 }, (_, i) => log({ reviewedAt: now - (100 - i) * MIN }))
    const events = deriveMilestones(logs)
    const reviews100 = events.find((e) => e.type === 'reviews' && e.threshold === 100)
    expect(reviews100).toBeDefined()
    expect(reviews100?.date).toBe(logs[99].reviewedAt)
  })

  it('sorts events most-recent first', () => {
    const now = Date.now()
    const logs = [
      log({ reviewedAt: now - 2 * DAY }),
      log({ reviewedAt: now - DAY }),
      log({ reviewedAt: now }),
    ]
    const events = deriveMilestones(logs)
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].date).toBeGreaterThanOrEqual(events[i].date)
    }
  })
})
