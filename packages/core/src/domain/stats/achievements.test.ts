import { afterAll, describe, expect, it } from 'vitest'
import type { ReviewLog } from '../../types'
import { pinTimeZone, DST_TEST_TIME_ZONE } from '../../test/timeZone'
import { computeAchievements, sessionAchievementUnlocks } from './achievements'

const restore = pinTimeZone(DST_TEST_TIME_ZONE)
afterAll(restore)
const at = (day: number, month = 10, hour = 12) => new Date(2026, month - 1, day, hour).getTime()
function log(day: number, fields: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: `log-${day}`, cardId: `card-${day}`, reviewedAt: at(day),
    rating: 3, autoGraded: false, durationMs: 1000,
    stabilityBefore: 1, stabilityAfter: 2, difficultyBefore: 5, difficultyAfter: 5,
    stateBefore: 'review', state: 'review', dueBefore: at(day, 10, 10),
    ...fields,
  }
}
const achievement = (logs: ReviewLog[], id: string, now = at(31)) =>
  computeAchievements(logs, now).find((item) => item.id === id)!

describe('four scheduled-study achievements', () => {
  it('offers exactly four reachable achievements with no fabricated unlocks', () => {
    const items = computeAchievements([], at(31))
    expect(items.map((item) => item.id)).toEqual(['first-session', 'five-days', 'four-weeks', 'comeback'])
    expect(items.every((item) => item.progress === 0 && item.unlockedAt === undefined)).toBe(true)
  })

  it('requires a committed completion marker, not a review or a gap-clustered session', () => {
    expect(achievement([log(1)], 'first-session').unlockedAt).toBeUndefined()
    expect(achievement([log(1, { sessionCompleted: true })], 'first-session').unlockedAt).toBe(at(1))
    expect(achievement([log(1, { sessionCompleted: true, dueBefore: at(2) })], 'first-session').unlockedAt).toBeUndefined()
  })

  it('counts distinct days in a rolling seven-day window, including the DST transition', () => {
    const logs = [23, 24, 25, 27, 29].map((day) => log(day))
    expect(achievement(logs, 'five-days').unlockedAt).toBe(at(29))
    expect(achievement([...logs, log(29, { id: 'repeat' })], 'five-days').progress).toBe(5)
    expect(achievement([23, 24, 25, 27, 30].map((day) => log(day)), 'five-days').unlockedAt).toBeUndefined()
  })

  it('keeps past unlocks after the window and shows current progress before earning', () => {
    const logs = [1, 2, 3, 4, 5].map((day) => log(day))
    expect(achievement(logs, 'five-days').unlockedAt).toBe(at(5))
    expect(achievement(logs, 'five-days').progress).toBe(5)
    expect(achievement([log(20), log(30)], 'five-days').progress).toBe(1)
  })

  it('counts Monday-to-Sunday weeks once, without requiring consecutive weeks', () => {
    const logs = [log(4), log(5), log(6), log(12), log(26)]
    expect(achievement(logs, 'four-weeks').unlockedAt).toBe(at(26))
    expect(achievement([log(5), log(6), log(11)], 'four-weeks').progress).toBe(1)
  })

  it('accepts Hard, Good and Easy recovery only on a later day and when due', () => {
    const miss = log(1, { cardId: 'missed', rating: 1, dueAfter: at(2) })
    for (const rating of [2, 3, 4] as const) {
      expect(achievement([miss, log(2, { cardId: 'missed', rating })], 'comeback').unlockedAt).toBe(at(2))
    }
    expect(achievement([miss, log(1, { id: 'retry', cardId: 'missed', reviewedAt: at(1, 10, 15) })], 'comeback').unlockedAt).toBeUndefined()
    expect(achievement([miss, log(2, { cardId: 'missed', dueBefore: at(3) })], 'comeback').unlockedAt).toBeUndefined()
    expect(achievement([miss, log(2)], 'comeback').unlockedAt).toBeUndefined()
    expect(achievement([miss, log(2, { cardId: 'missed', rating: 1 })], 'comeback').unlockedAt).toBeUndefined()
  })

  it('uses proven previous dueAfter for older logs, but never guesses from missing history', () => {
    const miss = log(1, { cardId: 'missed', rating: 1, dueBefore: undefined, dueAfter: at(2) })
    const recalled = log(2, { cardId: 'missed', dueBefore: undefined })
    expect(achievement([miss, recalled], 'comeback').unlockedAt).toBe(at(2))
    expect(achievement([recalled], 'four-weeks').progress).toBe(0)
    expect(achievement([log(1, { dueBefore: undefined })], 'first-session').unlockedAt).toBeUndefined()
  })

  it('ignores early and future reviews, preserves input, and records the first crossing', () => {
    const logs = [log(7, { sessionCompleted: true }), log(1, { sessionCompleted: true }),
      log(3, { dueBefore: at(4) }), log(30)]
    const copy = structuredClone(logs)
    const items = computeAchievements(logs, at(8))
    expect(items[0].unlockedAt).toBe(at(1))
    expect(items[1].progress).toBe(1)
    expect(logs).toEqual(copy)
  })

  it('acknowledges only new unlocks regardless of query refresh timing and supports Undo', () => {
    const old = log(1, { sessionCompleted: true })
    const session = [log(2), log(3), log(4), log(5)]
    expect(sessionAchievementUnlocks([old], session, at(5)).map((item) => item.id)).toEqual(['five-days'])
    expect(sessionAchievementUnlocks([old, ...session], session, at(5)).map((item) => item.id)).toEqual(['five-days'])
    expect(achievement([old, ...session.slice(0, -1)], 'five-days').unlockedAt).toBeUndefined()
  })
})