// The streak regression from the release-readiness audit (P1-2).
//
// Ten reviews on ten genuinely consecutive local dates spanning the 2026-10-25
// fall-back transition in Europe/Belgrade reported `{ current: 4, best: 6 }`:
// the run broke at the 25-hour day and the historical best was permanently
// capped at the longest DST-free run. Timezone pinned per src/test/timeZone.ts.
import { afterAll, describe, expect, it } from 'vitest'
import type { ReviewLog } from '../../types'
import { DST_TEST_TIME_ZONE, pinTimeZone, timeZoneOffsetsAreCetCest } from '../../test/timeZone'

const restoreTimeZone = pinTimeZone(DST_TEST_TIME_ZONE)
afterAll(restoreTimeZone)

// Dynamic, so the pin above applies to everything this module builds at load.
const { computeStreak } = await import('./streak')

// Local noon on a given date - far enough from both midnight and the 02:00/03:00
// transition instants that nothing here depends on where the boundary sits.
function log(month: number, day: number, id = `log-${month}-${day}`): ReviewLog {
  return {
    id,
    cardId: 'card-1',
    reviewedAt: new Date(2026, month - 1, day, 12, 0).getTime(),
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

const noon = (month: number, day: number) => new Date(2026, month - 1, day, 12, 0).getTime()
const daysOf = (month: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => log(month, from + i))

it('really runs in CET/CEST', () => {
  expect(timeZoneOffsetsAreCetCest()).toBe(true)
})

describe('computeStreak across the fall-back transition (2026-10-25)', () => {
  // The audit's exact reproduction.
  it('counts ten consecutive local dates as ten, not four', () => {
    const logs = daysOf(10, 20, 29)
    expect(computeStreak(logs, noon(10, 29))).toEqual({
      current: 10,
      best: 10,
      activeToday: true,
    })
  })

  it('counts the transition date itself as one ordinary day', () => {
    expect(computeStreak(daysOf(10, 24, 26), noon(10, 26)).current).toBe(3)
  })

  it('keeps the grace day alive across the transition', () => {
    // Studied through Oct 25 (the 25-hour day), nothing yet on Oct 26.
    const streak = computeStreak(daysOf(10, 23, 25), noon(10, 26))
    expect(streak.activeToday).toBe(false)
    expect(streak.current).toBe(3)
  })

  it('breaks once a whole local date has been missed across the transition', () => {
    // Nothing on Oct 26, nothing on Oct 27: the run ended.
    const streak = computeStreak(daysOf(10, 23, 25), noon(10, 27))
    expect(streak.current).toBe(0)
    expect(streak.best).toBe(3) // best stays the historical best
  })

  it('stops at a real gap rather than at the transition', () => {
    // Oct 24 missing; Oct 25-27 is the live run.
    const logs = [...daysOf(10, 20, 23), ...daysOf(10, 25, 27)]
    const streak = computeStreak(logs, noon(10, 27))
    expect(streak.current).toBe(3)
    expect(streak.best).toBe(4)
  })
})

describe('computeStreak across the spring-forward transition (2026-03-29)', () => {
  it('counts seven consecutive local dates as seven', () => {
    const logs = daysOf(3, 25, 31)
    expect(computeStreak(logs, noon(3, 31))).toEqual({
      current: 7,
      best: 7,
      activeToday: true,
    })
  })

  it('keeps the grace day alive across the transition', () => {
    // Studied through Mar 29 (the 23-hour day), nothing yet on Mar 30.
    const streak = computeStreak(daysOf(3, 27, 29), noon(3, 30))
    expect(streak.activeToday).toBe(false)
    expect(streak.current).toBe(3)
  })

  it('breaks once a whole local date has been missed', () => {
    expect(computeStreak(daysOf(3, 27, 29), noon(3, 31)).current).toBe(0)
  })
})

describe('computeStreak across both transitions in one history', () => {
  it('reports a year-long unbroken run at its true length', () => {
    // 2026-01-01 through 2026-12-31: 365 dates, two transitions inside them.
    const logs = Array.from({ length: 365 }, (_, i) => ({
      ...log(1, 1, `log-${i}`),
      reviewedAt: new Date(2026, 0, 1 + i, 12, 0).getTime(),
    }))
    const streak = computeStreak(logs, new Date(2026, 11, 31, 12, 0).getTime())
    expect(streak.current).toBe(365)
    expect(streak.best).toBe(365)
  })
})
