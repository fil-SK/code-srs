// Every remaining local-day statistic, across both 2026 DST transitions.
//
// Companion to streak.dst.test.ts: the same fixed-24-hour arithmetic that
// truncated streaks also emptied pace buckets that had reviews in them,
// mis-bucketed the activity heat map, suppressed streak milestones, mislabelled
// "Yesterday" and shifted range boundaries off local midnight. Timezone pinned
// per src/test/timeZone.ts.
import { afterAll, describe, expect, it } from 'vitest'
import type { ReviewLog } from '@/types'
import { DST_TEST_TIME_ZONE, pinTimeZone, timeZoneOffsetsAreCetCest } from '@/test/timeZone'

const restoreTimeZone = pinTimeZone(DST_TEST_TIME_ZONE)
afterAll(restoreTimeZone)

// Dynamic, so the pin applies before these modules build their module-scope
// Intl.DateTimeFormat instances, which capture the zone at construction.
const { computePaceSeries } = await import('./todayMetrics')
const { computeHeatmap, deriveMilestones } = await import('./progressMetrics')
const { buildRange, previousPeriod, formatEventDate } = await import('./dateRange')
const { buildHistoryRange } = await import('./reviewHistory')
const { calendarDaysBetween, eachCalendarDay, startOfDay } = await import('./calendarDay')

const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).getTime()

const dateOf = (ms: number) => new Date(ms).toDateString()

let counter = 0
function log(month: number, day: number, hour = 12): ReviewLog {
  return {
    id: `log-${counter++}`,
    cardId: 'card-1',
    reviewedAt: at(month, day, hour),
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

it('really runs in CET/CEST', () => {
  expect(timeZoneOffsetsAreCetCest()).toBe(true)
})

describe('computePaceSeries across a transition', () => {
  // The audit saw buckets keyed at 01:00 with a count of 0 while reviews for
  // that date existed.
  it('gives one bucket per local date, each starting at local midnight', () => {
    const days = computePaceSeries([], at(10, 29))
    expect(days.map((d) => dateOf(d.date))).toEqual([
      'Fri Oct 23 2026',
      'Sat Oct 24 2026',
      'Sun Oct 25 2026',
      'Mon Oct 26 2026',
      'Tue Oct 27 2026',
      'Wed Oct 28 2026',
      'Thu Oct 29 2026',
    ])
    expect(days.every((d) => startOfDay(d.date) === d.date)).toBe(true)
    expect(days.filter((d) => d.isToday)).toHaveLength(1)
    expect(dateOf(days[6].date)).toBe('Thu Oct 29 2026')
  })

  it('counts each review on its own local date around the fall transition', () => {
    const logs = [
      log(10, 23),
      log(10, 24),
      log(10, 25),
      log(10, 25),
      log(10, 26),
      log(10, 29),
    ]
    const days = computePaceSeries(logs, at(10, 29))
    expect(days.map((d) => d.count)).toEqual([1, 1, 2, 1, 0, 0, 1])
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(logs.length)
  })

  it('counts each review on its own local date around the spring transition', () => {
    const logs = [log(3, 27), log(3, 29), log(3, 29), log(3, 30), log(3, 31)]
    const days = computePaceSeries(logs, at(3, 31))
    expect(days.map((d) => dateOf(d.date))[6]).toBe('Tue Mar 31 2026')
    expect(days.map((d) => d.count)).toEqual([0, 0, 1, 0, 2, 1, 1])
  })

  it('keeps reviews at the far edges of the long day inside it', () => {
    // 00:30 and 23:30 on Oct 25 - the two instants an hour of drift would move.
    const logs = [log(10, 25, 0), log(10, 25, 23)]
    const days = computePaceSeries(logs, at(10, 27))
    const longDay = days.find((d) => dateOf(d.date) === 'Sun Oct 25 2026')
    expect(longDay?.count).toBe(2)
  })

  it('excludes reviews outside the seven-day window', () => {
    expect(computePaceSeries([log(10, 20)], at(10, 29)).every((d) => d.count === 0)).toBe(true)
  })
})

describe('computeHeatmap across a transition', () => {
  it('emits exactly the requested number of sequential local dates', () => {
    const days = computeHeatmap([], 30, at(11, 5))
    expect(days).toHaveLength(30)
    expect(days.map((d) => d.date)).toEqual(eachCalendarDay(at(10, 7), 30))
    expect(new Set(days.map((d) => dateOf(d.date))).size).toBe(30)
    for (let i = 1; i < days.length; i++) {
      expect(calendarDaysBetween(days[i - 1].date, days[i].date)).toBe(1)
    }
  })

  it('places each review in its own local-date cell', () => {
    const logs = [log(10, 24), log(10, 25), log(10, 25), log(10, 26)]
    const days = computeHeatmap(logs, 7, at(10, 27))
    const byDate = new Map(days.map((d) => [dateOf(d.date), d.count]))
    expect(byDate.get('Sat Oct 24 2026')).toBe(1)
    expect(byDate.get('Sun Oct 25 2026')).toBe(2)
    expect(byDate.get('Mon Oct 26 2026')).toBe(1)
    expect(byDate.get('Tue Oct 27 2026')).toBe(0)
  })

  it('does the same across the spring transition', () => {
    const logs = [log(3, 28), log(3, 29), log(3, 30)]
    const days = computeHeatmap(logs, 7, at(3, 31))
    expect(days).toHaveLength(7)
    const byDate = new Map(days.map((d) => [dateOf(d.date), d.count]))
    expect(byDate.get('Sat Mar 28 2026')).toBe(1)
    expect(byDate.get('Sun Mar 29 2026')).toBe(1)
    expect(byDate.get('Mon Mar 30 2026')).toBe(1)
  })
})

describe('deriveMilestones across a transition', () => {
  it('awards a 3-day streak whose run spans the fall transition', () => {
    const events = deriveMilestones([log(10, 24), log(10, 25), log(10, 26)])
    const streak3 = events.find((e) => e.type === 'streak' && e.threshold === 3)
    expect(streak3).toBeDefined()
    expect(dateOf(streak3!.date)).toBe('Mon Oct 26 2026')
  })

  it('awards a 7-day streak whose run spans the spring transition', () => {
    const logs = Array.from({ length: 7 }, (_, i) => log(3, 25 + i))
    const events = deriveMilestones(logs)
    const streak7 = events.find((e) => e.type === 'streak' && e.threshold === 7)
    expect(streak7).toBeDefined()
    expect(dateOf(streak7!.date)).toBe('Tue Mar 31 2026')
  })

  it('still refuses a streak milestone when a local date is genuinely missed', () => {
    const events = deriveMilestones([log(10, 24), log(10, 26), log(10, 27)])
    expect(events.find((e) => e.type === 'streak' && e.threshold === 3)).toBeUndefined()
  })
})

describe('formatEventDate across a transition', () => {
  it('labels the current local date Today', () => {
    expect(formatEventDate(at(10, 25, 9), at(10, 25, 20))).toBe('Today')
    expect(formatEventDate(at(3, 29, 9), at(3, 29, 20))).toBe('Today')
  })

  it('labels the previous local date Yesterday across the fall transition', () => {
    // 25 hours between these two local midnights.
    expect(formatEventDate(at(10, 25), at(10, 26))).toBe('Yesterday')
  })

  it('labels the previous local date Yesterday across the spring transition', () => {
    // 23 hours between these two local midnights.
    expect(formatEventDate(at(3, 29), at(3, 30))).toBe('Yesterday')
  })

  it('falls back to the absolute date further back, unchanged', () => {
    expect(formatEventDate(at(10, 20), at(10, 26))).toBe('Oct 20')
    expect(formatEventDate(at(3, 24), at(3, 30))).toBe('Mar 24')
  })
})

describe('date ranges across a transition', () => {
  it('covers seven local dates ending today, `to` exclusive', () => {
    const range = buildRange('7d', at(10, 26))
    expect(calendarDaysBetween(range.from, range.to)).toBe(7)
    expect(dateOf(range.from)).toBe('Tue Oct 20 2026')
    expect(dateOf(range.to)).toBe('Tue Oct 27 2026')
    expect(startOfDay(range.from)).toBe(range.from)
    expect(startOfDay(range.to)).toBe(range.to)
    // A review at any hour of the last included date is inside the window.
    expect(at(10, 26, 23) < range.to).toBe(true)
  })

  it('abuts the previous period exactly, with no gap and no overlap', () => {
    const range = buildRange('7d', at(10, 26))
    const previous = previousPeriod(range)
    expect(previous.to).toBe(range.from)
    expect(calendarDaysBetween(previous.from, previous.to)).toBe(7)
    expect(dateOf(previous.from)).toBe('Tue Oct 13 2026')
  })

  it('does the same for a 30-day window spanning the spring transition', () => {
    const range = buildRange('30d', at(4, 10))
    const previous = previousPeriod(range)
    expect(calendarDaysBetween(range.from, range.to)).toBe(30)
    expect(calendarDaysBetween(previous.from, previous.to)).toBe(30)
    expect(previous.to).toBe(range.from)
    expect(dateOf(range.from)).toBe('Thu Mar 12 2026')
  })

  it('builds review-history windows the same way', () => {
    const range = buildHistoryRange('30d', at(10, 26))!
    expect(calendarDaysBetween(range.from, range.to)).toBe(30)
    expect(startOfDay(range.from)).toBe(range.from)
    expect(dateOf(range.to)).toBe('Tue Oct 27 2026')
  })
})
