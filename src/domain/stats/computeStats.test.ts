import { describe, expect, it } from 'vitest'
import type { Card, ReviewLog } from '@/types'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { computeStats } from './computeStats'

const DAY = 86_400_000
// Fixed "now" at a local noon so day bucketing is unambiguous.
const NOW = new Date(2026, 0, 15, 12, 0, 0).getTime()

function log(daysAgo: number, over: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: Math.random().toString(),
    cardId: 'c',
    reviewedAt: NOW - daysAgo * DAY,
    rating: 3,
    autoGraded: false,
    durationMs: 0,
    stabilityBefore: 0,
    stabilityAfter: 0,
    difficultyBefore: 0,
    difficultyAfter: 0,
    state: 'review',
    ...over,
  }
}

function card(dueDaysFromNow: number, suspended = false): Card {
  return {
    id: Math.random().toString(),
    deckId: 'd',
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    suspended,
    scheduling: { ...initialSchedulingState(NOW), due: NOW + dueDaysFromNow * DAY },
    type: 'basic',
    content: { front: 'q', back: 'a' },
  }
}

describe('computeStats', () => {
  it('counts reviews per day (today is the last bucket)', () => {
    const s = computeStats([log(0), log(0), log(1)], [], NOW)
    expect(s.reviewsPerDay[13]).toBe(2) // today
    expect(s.reviewsPerDay[12]).toBe(1) // yesterday
    expect(s.totalReviews).toBe(3)
  })

  it('computes retention over mature reviews (Again counts as a lapse)', () => {
    const logs = [
      log(1, { rating: 3 }),
      log(2, { rating: 1 }), // lapse
      log(3, { state: 'learning', rating: 1 }), // not mature → excluded
    ]
    expect(computeStats(logs, [], NOW).retention).toBeCloseTo(0.5)
  })

  it('returns null retention with no mature reviews', () => {
    expect(computeStats([], [], NOW).retention).toBeNull()
  })

  it('counts a consecutive streak ending today', () => {
    expect(computeStats([log(0), log(1), log(2)], [], NOW).streak).toBe(3)
  })

  it('breaks the streak on a gap', () => {
    expect(computeStats([log(0), log(2)], [], NOW).streak).toBe(1)
  })

  it('forecasts due cards, rolling overdue into today and skipping suspended', () => {
    const s = computeStats([], [card(-3), card(0), card(2), card(2, true)], NOW)
    expect(s.forecast[0]).toBe(2) // overdue + today
    expect(s.forecast[2]).toBe(1) // suspended excluded
  })
})
