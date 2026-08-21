import { describe, expect, it } from 'vitest'
import type { ReviewLog } from '@/types'
import { computeStreak } from './streak'

// Fixed clock throughout - a streak test that reads the machine's date would
// pass or fail depending on the hour it ran.
const NOW = new Date(2026, 7, 18, 14, 30).getTime() // 2026-08-18, local

// `daysAgo` local calendar days back from NOW, mid-morning so no assertion
// sits near a day boundary by accident.
function log(daysAgo: number, id = `log-${daysAgo}`): ReviewLog {
  const d = new Date(2026, 7, 18 - daysAgo, 10, 0)
  return {
    id,
    cardId: 'card-1',
    reviewedAt: d.getTime(),
    rating: 3,
    autoGraded: false,
    durationMs: 5_000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore: 'review',
    state: 'review',
  }
}

describe('computeStreak', () => {
  it('is zero with no reviews', () => {
    expect(computeStreak([], NOW)).toEqual({ current: 0, best: 0, activeToday: false })
  })

  it('counts today plus the consecutive days before it', () => {
    const streak = computeStreak([log(0), log(1), log(2)], NOW)
    expect(streak.current).toBe(3)
    expect(streak.activeToday).toBe(true)
  })

  // The grace rule: studying through yesterday keeps the streak alive until a
  // full local calendar day has actually been missed.
  it('stays active when the learner studied through yesterday but not yet today', () => {
    const streak = computeStreak([log(1), log(2), log(3)], NOW)
    expect(streak.current).toBe(3)
    expect(streak.activeToday).toBe(false)
  })

  it('breaks once a whole day has been missed', () => {
    // Nothing today, nothing yesterday: the run ended.
    expect(computeStreak([log(2), log(3), log(4)], NOW).current).toBe(0)
  })

  it('stops counting at the first gap', () => {
    // Today, yesterday, then a missing day, then more history.
    expect(computeStreak([log(0), log(1), log(3), log(4)], NOW).current).toBe(2)
  })

  it('counts a day once however many reviews it holds', () => {
    const sameDay = [log(0, 'a'), log(0, 'b'), log(0, 'c'), log(1, 'd')]
    expect(computeStreak(sameDay, NOW).current).toBe(2)
  })

  it('reports the best run in history, which can exceed the current one', () => {
    // A 5-day run long ago, a 2-day run ending today.
    const logs = [
      log(20),
      log(21),
      log(22),
      log(23),
      log(24),
      log(0),
      log(1),
    ]
    const streak = computeStreak(logs, NOW)
    expect(streak.current).toBe(2)
    expect(streak.best).toBe(5)
  })

  it('is order-independent', () => {
    const forwards = computeStreak([log(2), log(1), log(0)], NOW)
    const backwards = computeStreak([log(0), log(2), log(1)], NOW)
    expect(forwards).toEqual(backwards)
  })
})
