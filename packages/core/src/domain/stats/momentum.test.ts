import { describe, expect, it } from 'vitest'
import type { ReviewLog } from '../../types'
import { addCalendarDays } from './calendarDay'
import { computeMomentum } from './momentum'

const now = new Date(2026, 9, 8, 12).getTime()
function log(at: number, overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: `review-${at}`, cardId: 'card', reviewedAt: at, dueBefore: at - 1,
    rating: 3, autoGraded: false, durationMs: 1000, stateBefore: 'review', state: 'review',
    stabilityBefore: 1, stabilityAfter: 2, difficultyBefore: 5, difficultyAfter: 5,
    ...overrides,
  }
}

describe('computeMomentum', () => {
  it('gives a new learner empty real day buckets and the first scheduled session', () => {
    const summary = computeMomentum([], now, 2)
    expect(summary.streak.current).toBe(0)
    expect(summary.status).toBe('Review a card to start your streak.')
    expect(summary.days).toHaveLength(7)
    expect(summary.days.every((day) => !day.studied)).toBe(true)
    expect(summary.days.filter((day) => day.isToday)).toHaveLength(1)
    expect(summary.nextAchievement?.id).toBe('first-session')
    expect(summary.earnedCount).toBe(0)
  })

  it('counts duplicate daily reviews once for activity and keeps the canonical grace day', () => {
    const yesterday = addCalendarDays(now, -1)
    const summary = computeMomentum([log(yesterday), log(yesterday + 1000)], now, 1)
    expect(summary.streak.current).toBe(1)
    expect(summary.streak.activeToday).toBe(false)
    expect(summary.days.filter((day) => day.studied)).toHaveLength(1)
    expect(summary.days.at(-1)?.studied).toBe(false)
    expect(summary.status).toBe('Review today to keep it going.')
  })

  it('acknowledges today and moves to the same next achievement as Progress', () => {
    const summary = computeMomentum([log(now, { sessionCompleted: true })], now, 1)
    expect(summary.status).toBe("You've studied today.")
    expect(summary.days.at(-1)?.studied).toBe(true)
    expect(summary.nextAchievement?.id).toBe('five-days')
    expect(summary.nextAchievement?.progressLabel).toBe('1 of 5 days in the last 7 days')
    expect(summary.earnedCount).toBe(1)
  })

  it('does not prompt early reviews to keep a streak when nothing is due', () => {
    const summary = computeMomentum([log(addCalendarDays(now, -1))], now, 0)
    expect(summary.streak.current).toBe(1)
    expect(summary.status).toBe('No cards due. Return when your next card is ready.')
  })

  it('distinguishes study activity from scheduled achievement eligibility and ignores future logs', () => {
    const summary = computeMomentum([
      log(now, { dueBefore: now + 1000, sessionCompleted: true }),
      log(now + 3600000, { sessionCompleted: true }),
    ], now, 0)
    expect(summary.streak.activeToday).toBe(true)
    expect(summary.days.at(-1)?.count).toBe(1)
    expect(summary.nextAchievement?.id).toBe('first-session')
    expect(summary.earnedCount).toBe(0)
  })

  it('does not invent another target when all four lifetime achievements are earned', () => {
    const history = [-21, -14, -7, -6, -5, -4, -3, 0].map((offset) => log(addCalendarDays(now, offset), {
      rating: offset === -3 ? 1 : 3,
      sessionCompleted: offset === 0,
    }))
    const summary = computeMomentum(history, now, 0)
    expect(summary.nextAchievement).toBeUndefined()
    expect(summary.earnedCount).toBe(4)
  })
})
