// Calendar-day arithmetic across both DST transitions.
//
// Runs under a pinned Europe/Belgrade so the assertions are about the calendar,
// not about the machine's zone; see src/test/timeZone.ts for the mechanism. In
// 2026 that zone's local days are 23 hours on Mar 29 (clocks forward at 02:00)
// and 25 hours on Oct 25 (clocks back at 03:00) - every case below is chosen
// against those two dates, verified from the runtime rather than assumed.
import { afterAll, describe, expect, it } from 'vitest'
import { DST_TEST_TIME_ZONE, pinTimeZone, timeZoneOffsetsAreCetCest } from '../../test/timeZone'

const restoreTimeZone = pinTimeZone(DST_TEST_TIME_ZONE)
afterAll(restoreTimeZone)

// Imported dynamically, after the pin: a static import is hoisted above it, and
// any module-scope `Intl.DateTimeFormat` in the graph would then capture the
// machine's zone instead of the pinned one. Same reason in every *.dst.test.ts.
const {
  addCalendarDays,
  calendarDaysBetween,
  eachCalendarDay,
  isNextCalendarDay,
  isSameCalendarDay,
  localDayIndex,
  startOfDay,
} = await import('./calendarDay')

const HOUR = 3_600_000
const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0).getTime()
const midnight = (y: number, m: number, d: number) => new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
const dateOf = (ms: number) => new Date(ms).toDateString()

describe('timezone pinning', () => {
  it('really runs in CET/CEST, so the DST cases below mean something', () => {
    expect(timeZoneOffsetsAreCetCest()).toBe(true)
  })

  // The premise of the whole finding: these two local days are not 24 hours.
  it('has a 23-hour local day on 2026-03-29 and a 25-hour one on 2026-10-25', () => {
    expect((midnight(2026, 3, 30) - midnight(2026, 3, 29)) / HOUR).toBe(23)
    expect((midnight(2026, 10, 26) - midnight(2026, 10, 25)) / HOUR).toBe(25)
  })
})

describe('addCalendarDays', () => {
  it('steps ordinary consecutive dates', () => {
    expect(addCalendarDays(noon(2026, 1, 12), 1)).toBe(midnight(2026, 1, 13))
    expect(dateOf(addCalendarDays(noon(2026, 1, 12), 1))).toBe('Tue Jan 13 2026')
  })

  it('steps across the spring-forward day, which is only 23 hours long', () => {
    expect(addCalendarDays(noon(2026, 3, 29), 1)).toBe(midnight(2026, 3, 30))
    // What the old implementation did instead, kept as the contrast:
    expect(startOfDay(noon(2026, 3, 29)) + 24 * HOUR).not.toBe(midnight(2026, 3, 30))
  })

  it('steps across the fall-back day, which is 25 hours long', () => {
    expect(addCalendarDays(noon(2026, 10, 25), 1)).toBe(midnight(2026, 10, 26))
    expect(startOfDay(noon(2026, 10, 25)) + 24 * HOUR).not.toBe(midnight(2026, 10, 26))
  })

  it('subtracts days across both transitions', () => {
    expect(addCalendarDays(noon(2026, 3, 30), -1)).toBe(midnight(2026, 3, 29))
    expect(addCalendarDays(noon(2026, 10, 26), -1)).toBe(midnight(2026, 10, 25))
  })

  it('adds several days across a transition in one call', () => {
    expect(addCalendarDays(noon(2026, 10, 20), 10)).toBe(midnight(2026, 10, 30))
    expect(addCalendarDays(noon(2026, 3, 25), 10)).toBe(midnight(2026, 4, 4))
  })

  it('crosses month boundaries', () => {
    expect(addCalendarDays(noon(2026, 10, 31), 1)).toBe(midnight(2026, 11, 1))
    expect(addCalendarDays(noon(2026, 3, 1), -1)).toBe(midnight(2026, 2, 28))
  })

  it('crosses year boundaries', () => {
    expect(addCalendarDays(noon(2026, 12, 31), 1)).toBe(midnight(2027, 1, 1))
    expect(addCalendarDays(noon(2026, 1, 1), -1)).toBe(midnight(2025, 12, 31))
  })

  it('always lands on a value startOfDay would produce for that same day', () => {
    // Guards the post-shift re-normalization: the result must be the canonical
    // start of its own local day, whatever the offset did in between.
    for (let i = -400; i <= 400; i += 7) {
      const result = addCalendarDays(noon(2026, 10, 25), i)
      expect(startOfDay(result)).toBe(result)
    }
  })

  it('is a no-op for zero beyond normalizing to the day start', () => {
    expect(addCalendarDays(noon(2026, 10, 25), 0)).toBe(midnight(2026, 10, 25))
  })
})

describe('calendarDaysBetween / adjacency', () => {
  it('measures one day across each transition', () => {
    expect(calendarDaysBetween(noon(2026, 3, 29), noon(2026, 3, 30))).toBe(1)
    expect(calendarDaysBetween(noon(2026, 10, 25), noon(2026, 10, 26))).toBe(1)
  })

  it('is signed and independent of the time of day', () => {
    const lateOnTheLongDay = new Date(2026, 9, 25, 23, 59).getTime()
    const earlyNextDay = new Date(2026, 9, 26, 0, 30).getTime()
    expect(calendarDaysBetween(lateOnTheLongDay, earlyNextDay)).toBe(1)
    expect(calendarDaysBetween(earlyNextDay, lateOnTheLongDay)).toBe(-1)
  })

  it('counts a ten-day run that spans the fall transition as ten days', () => {
    expect(calendarDaysBetween(noon(2026, 10, 20), noon(2026, 10, 29))).toBe(9)
  })

  it('reports adjacency and sameness by calendar date, not elapsed hours', () => {
    expect(isNextCalendarDay(noon(2026, 10, 25), noon(2026, 10, 26))).toBe(true)
    expect(isNextCalendarDay(noon(2026, 3, 29), noon(2026, 3, 30))).toBe(true)
    expect(isNextCalendarDay(noon(2026, 10, 25), noon(2026, 10, 27))).toBe(false)
    expect(isSameCalendarDay(new Date(2026, 9, 25, 1).getTime(), noon(2026, 10, 25))).toBe(true)
    expect(isSameCalendarDay(noon(2026, 10, 25), noon(2026, 10, 26))).toBe(false)
  })

  it('gives consecutive dates consecutive indices across a transition', () => {
    expect(localDayIndex(noon(2026, 10, 26)) - localDayIndex(noon(2026, 10, 25))).toBe(1)
    expect(localDayIndex(noon(2026, 3, 30)) - localDayIndex(noon(2026, 3, 29))).toBe(1)
  })
})

describe('eachCalendarDay', () => {
  it('enumerates exactly `count` sequential local dates across a transition', () => {
    const days = eachCalendarDay(noon(2026, 10, 23), 5)
    expect(days.map(dateOf)).toEqual([
      'Fri Oct 23 2026',
      'Sat Oct 24 2026',
      'Sun Oct 25 2026',
      'Mon Oct 26 2026',
      'Tue Oct 27 2026',
    ])
    expect(new Set(days).size).toBe(5)
    expect(days.every((d) => startOfDay(d) === d)).toBe(true)
  })

  it('enumerates across the spring transition with no missing or duplicated date', () => {
    const days = eachCalendarDay(noon(2026, 3, 27), 5)
    expect(days.map(dateOf)).toEqual([
      'Fri Mar 27 2026',
      'Sat Mar 28 2026',
      'Sun Mar 29 2026',
      'Mon Mar 30 2026',
      'Tue Mar 31 2026',
    ])
  })

  it('returns nothing for a zero count', () => {
    expect(eachCalendarDay(noon(2026, 10, 25), 0)).toEqual([])
  })
})
