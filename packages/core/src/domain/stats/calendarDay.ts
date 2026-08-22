import type { Millis } from '../../types'

// Local calendar-day arithmetic - the one place in the product that answers
// "what is the previous / next / Nth local calendar day".
//
// A local civil day is not 24 hours. In a DST-observing timezone it is 23 hours
// when the clocks go forward and 25 when they go back, so stepping between days
// by adding 86,400,000 ms lands an hour off a local midnight and every day-set
// lookup after it misses. That is a real, dated defect: reviews on ten
// consecutive local days spanning 2026-10-25 in Europe/Belgrade reported a
// 4-day streak.
//
// Elapsed time and calendar days are different concepts, and this module owns
// only the second one. Durations, FSRS intervals and absolute timestamps stay
// absolute epoch milliseconds and must not come through here.

const MS_PER_UTC_DAY = 86_400_000

/**
 * Days since the Unix epoch for the **local** calendar date containing `ms`.
 *
 * The local year/month/date components are projected onto `Date.UTC`, where a
 * day is exactly 24 hours by definition and no offset rule applies. This is
 * arithmetic on a calendar date, not on an instant, which is what makes
 * adjacency literally `next === previous + 1`.
 */
export function localDayIndex(ms: Millis): number {
  const d = new Date(ms)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_UTC_DAY
}

// The one local-calendar-day boundary every stats module shares. Exported
// (and re-exported from ./dateRange) because streaks, the activity heatmap, the
// Today pace series and range building all have to agree on where a day starts,
// and three private copies of it is exactly how they would silently stop
// agreeing. Deliberately local midnight, never UTC midnight: a learner's streak
// is defined by their own calendar date.
export function startOfDay(ms: Millis): Millis {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Local midnight of the day `days` calendar days after the day containing `ms`
 * (negative `days` steps backwards).
 */
export function addCalendarDays(ms: Millis, days: number): Millis {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  // Re-normalized after the shift because a zone whose transition happens at
  // midnight has no 00:00 on that date; without this the result would be an
  // 01:00 value that startOfDay would never produce, and the two would disagree.
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Signed number of calendar days from `a`'s local date to `b`'s local date. */
export function calendarDaysBetween(a: Millis, b: Millis): number {
  return localDayIndex(b) - localDayIndex(a)
}

/** True when `a` and `b` fall on the same local calendar date. */
export function isSameCalendarDay(a: Millis, b: Millis): boolean {
  return localDayIndex(a) === localDayIndex(b)
}

/** True when `b`'s local date is exactly the day after `a`'s. */
export function isNextCalendarDay(a: Millis, b: Millis): boolean {
  return calendarDaysBetween(a, b) === 1
}

/** `count` consecutive local midnights, starting at the day containing `ms`. */
export function eachCalendarDay(ms: Millis, count: number): Millis[] {
  const days: Millis[] = []
  for (let i = 0; i < count; i++) days.push(addCalendarDays(ms, i))
  return days
}
