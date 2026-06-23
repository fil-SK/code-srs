import { describe, expect, it } from 'vitest'
import { initialSchedulingState } from './state'
import { previewStates, reviewState, buildReviewLog } from './scheduler'
import { formatInterval } from './format'

const NOW = 1_700_000_000_000 // fixed instant

describe('scheduler.reviewState', () => {
  it('advances a new card on Good (reps increment, due moves forward)', () => {
    const start = initialSchedulingState(NOW)
    const next = reviewState(start, 3, NOW)
    expect(next.reps).toBe(1)
    expect(next.due).toBeGreaterThan(NOW)
    expect(next.state).not.toBe('new')
    expect(next.lastReview).toBe(NOW)
  })

  it('schedules Again sooner than Easy', () => {
    const start = initialSchedulingState(NOW)
    const again = reviewState(start, 1, NOW)
    const easy = reviewState(start, 4, NOW)
    expect(again.due).toBeLessThan(easy.due)
  })
})

describe('scheduler.previewStates', () => {
  it('returns monotonically non-decreasing due dates across grades', () => {
    const p = previewStates(initialSchedulingState(NOW), NOW)
    expect(p[1].due).toBeLessThanOrEqual(p[2].due)
    expect(p[2].due).toBeLessThanOrEqual(p[3].due)
    expect(p[3].due).toBeLessThanOrEqual(p[4].due)
  })
})

describe('buildReviewLog', () => {
  it('records exact before/after deltas', () => {
    const before = initialSchedulingState(NOW)
    const after = reviewState(before, 3, NOW)
    const log = buildReviewLog({
      cardId: 'c1',
      before,
      after,
      rating: 3,
      autoGraded: false,
      durationMs: 1234,
      now: NOW,
    })
    expect(log.cardId).toBe('c1')
    expect(log.rating).toBe(3)
    expect(log.stabilityBefore).toBe(before.stability)
    expect(log.stabilityAfter).toBe(after.stability)
    expect(log.state).toBe(after.state)
    expect(log.id).toBeTruthy()
  })
})

describe('formatInterval', () => {
  it('formats common ranges', () => {
    const m = 60_000
    expect(formatInterval(0, 0)).toBe('<1m')
    expect(formatInterval(0, 10 * m)).toBe('10m')
    expect(formatInterval(0, 3 * 60 * m)).toBe('3h')
    expect(formatInterval(0, 5 * 24 * 60 * m)).toBe('5d')
  })
})
