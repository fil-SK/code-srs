import type { Millis } from '../../types'
import { addCalendarDays, calendarDaysBetween, startOfDay } from './calendarDay'

// Re-exported so the many existing `from './dateRange'` imports keep resolving;
// the calculation itself lives in ./calendarDay with the rest of the local
// calendar-day arithmetic.
export { startOfDay }

export type DateRangePreset = '7d' | '30d' | '90d' | '1y'

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string; days: number }[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '1y', label: 'Last 12 months', days: 365 },
]

export interface DateRange {
  from: Millis // inclusive, start of day
  to: Millis // exclusive (start of the day after the last included day)
  days: number
}

// `to` is exclusive so a review logged any time "today" is included without
// needing a separate end-of-day boundary case. Both ends are local midnights
// reached by calendar stepping, so the window is `days` calendar dates whatever
// the UTC offset does inside it.
export function buildRange(preset: DateRangePreset, now: Millis = Date.now()): DateRange {
  const days = DATE_RANGE_PRESETS.find((p) => p.value === preset)?.days ?? 30
  const to = addCalendarDays(now, 1)
  return { from: addCalendarDays(to, -days), to, days }
}

// The immediately-preceding, equal-length window — used for KPI "vs last
// period" deltas. Equal length in *calendar days*: subtracting the elapsed span
// instead would leave a phantom one-hour gap (or overlap) whenever a transition
// falls inside one of the two windows.
export function previousPeriod(range: DateRange): DateRange {
  return { from: addCalendarDays(range.from, -range.days), to: range.from, days: range.days }
}

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatRangeLabel(range: DateRange): string {
  const start = new Date(range.from)
  const end = new Date(addCalendarDays(range.to, -1)) // last included day
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = sameYear ? MONTH_DAY.format(start) : MONTH_DAY_YEAR.format(start)
  return `${startLabel} – ${MONTH_DAY_YEAR.format(end)}`
}

const TIME_OF_DAY = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

// "2:14 PM" - pairs with formatEventDate to timestamp a single review.
export function formatTimeOfDay(date: Millis): string {
  return TIME_OF_DAY.format(new Date(date))
}

// "Today" / "Yesterday" / "Mon D[, YYYY]" for milestone/event timestamps.
export function formatEventDate(date: Millis, now: Millis = Date.now()): string {
  const day = startOfDay(date)
  const today = startOfDay(now)
  if (day === today) return 'Today'
  // Yesterday is the previous local calendar date, not "24 hours before the
  // current local midnight" - those differ on both transition days.
  if (calendarDaysBetween(date, now) === 1) return 'Yesterday'
  const d = new Date(day)
  return d.getFullYear() === new Date(today).getFullYear()
    ? MONTH_DAY.format(d)
    : MONTH_DAY_YEAR.format(d)
}
