import { describe, it, expect } from 'vitest'
import type { Card, Deck, ReviewLog } from '../../types'
import { buildRange } from './dateRange'
import { buildCardDeckMap } from './cardDeckIndex'
import {
  clusterSessions,
  computeKpis,
  computeHeatmap,
  computeRetention,
  computeRetentionSeries,
  computeReviewSeries,
  computeDeckPerformance,
  deriveMilestones,
  heatmapMonthLabels,
  toHeatmapWeeks,
} from './progressMetrics'

const MIN = 60_000

// Fixed clock, matching streak.test.ts. These statistics are defined over local
// calendar dates, so fixtures are placed by date - `Date.now() - n * 86_400_000`
// is not "n days ago" on either DST transition day. Transition behavior itself
// is covered in dstMetrics.dst.test.ts under a pinned zone.
const NOW = new Date(2026, 7, 18, 14, 30).getTime() // 2026-08-18, local
const daysAgo = (n: number, hour = 10) => new Date(2026, 7, 18 - n, hour, 0).getTime()

function log(overrides: Partial<ReviewLog>): ReviewLog {
  return {
    id: overrides.id ?? `log-${Math.random()}`,
    cardId: 'card-1',
    reviewedAt: NOW,
    rating: 3,
    autoGraded: false,
    durationMs: 1000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore: 'review',
    state: 'review',
    ...overrides,
  }
}

function card(overrides: Partial<Card>): Card {
  return {
    id: overrides.id ?? 'card-1',
    deckId: 'deck-1',
    scheduling: {
      due: NOW,
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
    createdAt: NOW,
    updatedAt: Date.now(),
    ...overrides,
  } as unknown as Card
}

function deck(id: string, name = id, parentId?: string): Deck {
  return { id, name, parentId, createdAt: 0, updatedAt: 0 }
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
  it('counts ReviewLog entries and compares the selected period with the previous one', () => {
    const now = NOW
    const range = buildRange('7d', now)
    const logs = [
      // 2 reviews in the current 7d window
      log({ reviewedAt: daysAgo(1), rating: 3 }),
      log({ reviewedAt: daysAgo(2), rating: 3 }),
      // 1 review in the previous window
      log({ reviewedAt: daysAgo(10), rating: 3 }),
    ]
    const kpis = computeKpis([], [], logs, range, now)
    expect(kpis.reviews.value).toBe(2)
    expect(kpis.reviews.deltaPct).toBe(100)
  })

  it('counts repeated reviews as Reviews but one current card as Learned', () => {
    const now = NOW
    const cards = [card({ id: 'a' }), card({ id: 'b' })]
    const logs = [
      log({ cardId: 'a', reviewedAt: daysAgo(1) }),
      log({ cardId: 'a', reviewedAt: daysAgo(2) }),
    ]
    const kpis = computeKpis(cards, [cards[1]], logs, buildRange('7d', now), now)
    expect(kpis.learned).toEqual({ value: 1, total: 2 })
    expect(kpis.due).toBe(1)
    expect(kpis.reviews.value).toBe(2)
  })

  it('returns null retention when there are no eligible reviews in range', () => {
    const range = buildRange('7d')
    const kpis = computeKpis([], [], [], range)
    expect(kpis.retention.value).toBeNull()
    expect(kpis.streak).toBe(0)
  })

  it('computes streak counting back from today with a one-day grace', () => {
    const now = NOW
    const range = buildRange('30d', now)
    const logs = [
      log({ reviewedAt: daysAgo(1) }),
      log({ reviewedAt: daysAgo(2) }),
      log({ reviewedAt: daysAgo(3) }),
    ]
    const kpis = computeKpis([], [], logs, range, now)
    expect(kpis.streak).toBe(3)
    expect(kpis.bestStreak).toBe(3)
  })
})

describe('computeRetention', () => {
  it('returns null for no logs or only new/learning reviews', () => {
    expect(computeRetention([])).toBeNull()
    expect(
      computeRetention([
        log({ stateBefore: 'new', state: 'review', rating: 4 }),
        log({ stateBefore: 'learning', state: 'review', rating: 3 }),
      ]),
    ).toBeNull()
  })

  it.each([
    ['Again', 1, 0],
    ['Hard', 2, 1],
    ['Good', 3, 1],
    ['Easy', 4, 1],
  ] as const)('counts a Review-state %s as expected', (_label, rating, expected) => {
    expect(computeRetention([log({ stateBefore: 'review', rating })])).toBe(expected)
  })

  it('includes relearning and computes the exact mature success fraction', () => {
    const logs = [
      log({ stateBefore: 'new', rating: 4 }),
      log({ stateBefore: 'learning', rating: 3 }),
      log({ stateBefore: 'review', rating: 1 }),
      log({ stateBefore: 'review', rating: 2 }),
      log({ stateBefore: 'relearning', rating: 3 }),
    ]
    expect(computeRetention(logs)).toBe(2 / 3)
  })

  it('does not fall back to the post-review state', () => {
    expect(
      computeRetention([log({ stateBefore: 'new', state: 'review', rating: 4 })]),
    ).toBeNull()
    expect(
      computeRetention([log({ stateBefore: 'review', state: 'relearning', rating: 1 })]),
    ).toBe(0)
  })
})

describe('computeReviewSeries', () => {
  it('counts every review in selected-range time buckets', () => {
    const now = NOW
    const range = buildRange('7d', now)
    const series = computeReviewSeries(
      [
        log({ cardId: 'same', reviewedAt: daysAgo(1) }),
        log({ cardId: 'same', reviewedAt: daysAgo(1) + MIN }),
        log({ reviewedAt: daysAgo(10) }),
      ],
      range,
      7,
    )
    expect(series.reduce((sum, point) => sum + point.count, 0)).toBe(2)
  })
})

describe('computeHeatmap', () => {
  it('returns one entry per day and marks the max day at the top level', () => {
    const now = NOW
    const logs = [log({ reviewedAt: now }), log({ reviewedAt: now }), log({ reviewedAt: daysAgo(1) })]
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
    const now = NOW
    const range = buildRange('7d', now)
    const logs = [
      log({ reviewedAt: daysAgo(1), rating: 3, state: 'review' }),
      log({ reviewedAt: daysAgo(1), rating: 1, state: 'review' }),
    ]
    const series = computeRetentionSeries(logs, range, new Map())
    const total = series.reduce((sum, p) => sum + (p.retention !== null ? 1 : 0), 0)
    expect(total).toBeGreaterThan(0)
  })

  it('scopes to a single deck via the cardId -> deckId join', () => {
    const now = NOW
    const range = buildRange('7d', now)
    const cards = [card({ id: 'a', deckId: 'deck-a' }), card({ id: 'b', deckId: 'deck-b' })]
    const logs = [
      log({ cardId: 'a', reviewedAt: daysAgo(1), rating: 3, state: 'review' }),
      log({ cardId: 'b', reviewedAt: daysAgo(1), rating: 1, state: 'review' }),
    ]
    const series = computeRetentionSeries(logs, range, buildCardDeckMap(cards), new Set(['deck-a']))
    const bucketWithData = series.find((p) => p.retention !== null)
    expect(bucketWithData?.retention).toBe(1)
  })
})

describe('computeDeckPerformance', () => {
  it('computes Learned, Due, and mature Retention for a leaf study scope', () => {
    const now = NOW
    const range = buildRange('7d', now)
    const cards = [
      card({ id: 'a', deckId: 'deck-a' }),
      card({ id: 'b', deckId: 'deck-a' }),
      card({ id: 'suspended', deckId: 'deck-a', suspended: true }),
    ]
    const logs = [
      log({ cardId: 'a', reviewedAt: daysAgo(1), rating: 3, stateBefore: 'review' }),
      log({ cardId: 'a', reviewedAt: daysAgo(1), rating: 1, stateBefore: 'review' }),
      log({ cardId: 'deleted-card', reviewedAt: daysAgo(1), rating: 3 }),
    ]
    const rows = computeDeckPerformance(logs, cards, [cards[1]], [deck('deck-a')], range)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      deckId: 'deck-a',
      learned: 1,
      active: 2,
      due: 1,
      retention: 0.5,
    })
  })

  it('keeps a due deck with zero selected-period reviews and orders it first', () => {
    const now = NOW
    const range = buildRange('7d', now)
    const cards = [card({ id: 'a', deckId: 'due' }), card({ id: 'b', deckId: 'studied' })]
    const logs = [log({ cardId: 'b', reviewedAt: daysAgo(1) })]
    const rows = computeDeckPerformance(
      logs,
      cards,
      [cards[0]],
      [deck('due', 'Due'), deck('studied', 'Studied')],
      range,
    )
    expect(rows[0]).toMatchObject({ deckId: 'due', due: 1, retention: null })
  })

  it('uses non-overlapping leaf scopes and excludes parent rows', () => {
    const now = NOW
    const cards = [
      card({ id: 'parent-card', deckId: 'parent' }),
      card({ id: 'child-card', deckId: 'child' }),
    ]
    const rows = computeDeckPerformance(
      [log({ cardId: 'child-card', reviewedAt: daysAgo(1) })],
      cards,
      [cards[0], cards[1]],
      [deck('parent', 'Parent'), deck('child', 'Child', 'parent')],
      buildRange('7d', now),
    )
    expect(rows.map((row) => row.deckId)).toEqual(['child'])
    expect(rows[0]).toMatchObject({ learned: 1, active: 1, due: 1 })
  })

  it('attributes a moved card to its current leaf deck and ignores deleted cards', () => {
    const now = NOW
    const cards = [card({ id: 'moved', deckId: 'to' })]
    const logs = [
      log({ cardId: 'moved', reviewedAt: daysAgo(1) }),
      log({ cardId: 'deleted', reviewedAt: daysAgo(1) }),
    ]
    const rows = computeDeckPerformance(
      logs,
      cards,
      [],
      [deck('from', 'From'), deck('to', 'To')],
      buildRange('7d', now),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ deckId: 'to', learned: 1 })
  })
})

describe('deriveMilestones', () => {
  it('returns no events for an empty history', () => {
    expect(deriveMilestones([])).toEqual([])
  })

  it('detects a 3-day streak milestone dated on the third consecutive day', () => {
    const now = NOW
    const logs = [
      log({ reviewedAt: daysAgo(2) }),
      log({ reviewedAt: daysAgo(1) }),
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
    const now = NOW
    const logs = Array.from({ length: 100 }, (_, i) => log({ reviewedAt: now - (100 - i) * MIN }))
    const events = deriveMilestones(logs)
    const reviews100 = events.find((e) => e.type === 'reviews' && e.threshold === 100)
    expect(reviews100).toBeDefined()
    expect(reviews100?.date).toBe(logs[99].reviewedAt)
  })

  it('sorts events most-recent first', () => {
    const now = NOW
    const logs = [
      log({ reviewedAt: daysAgo(2) }),
      log({ reviewedAt: daysAgo(1) }),
      log({ reviewedAt: now }),
    ]
    const events = deriveMilestones(logs)
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].date).toBeGreaterThanOrEqual(events[i].date)
    }
  })
})

describe('heat map layout', () => {
  // Both renderers draw this grid, so the shape is asserted here rather than in
  // either of them.
  const days = (count: number, from: number) =>
    computeHeatmap([], count, from).map((day) => ({ ...day }))

  it('starts the first column on the weekday the range starts on', () => {
    const range = days(30, NOW)
    const weeks = toHeatmapWeeks(range)
    const mondayFirst = (new Date(range[0].date).getDay() + 6) % 7

    expect(weeks[0].slice(0, mondayFirst).every((day) => day === null)).toBe(true)
    expect(weeks[0][mondayFirst]?.date).toBe(range[0].date)
    // Every cell is in the row its own weekday names.
    for (const week of weeks) {
      for (const [row, day] of week.entries()) {
        if (day) expect((new Date(day.date).getDay() + 6) % 7).toBe(row)
      }
    }
  })

  it('pads the last column so every column has seven slots', () => {
    for (const count of [1, 7, 30, 90, 365]) {
      const weeks = toHeatmapWeeks(days(count, NOW))
      expect(weeks.every((week) => week.length === 7)).toBe(true)
      expect(weeks.flat().filter((day) => day !== null)).toHaveLength(count)
    }
  })

  it('carries whatever else a day is decorated with', () => {
    // Each platform adds its own presentation fields to a HeatmapDay; bucketing
    // must not flatten them back to the bare shape.
    const decorated = days(7, NOW).map((day) => ({ ...day, label: 'x' }))
    const first = toHeatmapWeeks(decorated).flat().find((day) => day !== null)
    expect(first?.label).toBe('x')
  })

  it('names a month once, on the column its first day falls in', () => {
    const weeks = toHeatmapWeeks(days(90, NOW))
    const labels = heatmapMonthLabels(weeks, 1)
    const named = labels.filter((label): label is string => label !== null)

    expect(named).toEqual(['May', 'Jun', 'Jul', 'Aug'])
    expect(new Set(named).size).toBe(named.length)
    // A label names the month of the column it sits on, not a neighbour's.
    for (const [column, label] of labels.entries()) {
      if (label === null) continue
      const first = weeks[column].find((day) => day !== null)!
      expect(new Intl.DateTimeFormat('en-US', { month: 'short' }).format(first.date)).toBe(label)
    }
  })

  it('drops a label that would collide with the previous one', () => {
    const weeks = toHeatmapWeeks(days(90, NOW))
    // Two columns apart is a collision at every cell size either platform uses.
    expect(heatmapMonthLabels(weeks, 12).filter((label) => label !== null).length).toBeLessThan(
      heatmapMonthLabels(weeks, 1).filter((label) => label !== null).length,
    )
  })

  it('has no labels and no columns for an empty range', () => {
    expect(toHeatmapWeeks([])).toEqual([])
    expect(heatmapMonthLabels([])).toEqual([])
  })
})
