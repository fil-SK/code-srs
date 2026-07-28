import type { Millis } from '@/types'

const DAY = 86_400_000

function startOfDay(ms: Millis): Millis {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

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
// needing a separate end-of-day boundary case.
export function buildRange(preset: DateRangePreset, now: Millis = Date.now()): DateRange {
  const days = DATE_RANGE_PRESETS.find((p) => p.value === preset)?.days ?? 30
  const to = startOfDay(now) + DAY
  return { from: to - days * DAY, to, days }
}

// The immediately-preceding, equal-length window — used for KPI "vs last
// period" deltas.
export function previousPeriod(range: DateRange): DateRange {
  const span = range.to - range.from
  return { from: range.from - span, to: range.from, days: range.days }
}

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatRangeLabel(range: DateRange): string {
  const start = new Date(range.from)
  const end = new Date(range.to - DAY) // last included day
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = sameYear ? MONTH_DAY.format(start) : MONTH_DAY_YEAR.format(start)
  return `${startLabel} – ${MONTH_DAY_YEAR.format(end)}`
}

// "Today" / "Yesterday" / "Mon D[, YYYY]" for milestone/event timestamps.
export function formatEventDate(date: Millis, now: Millis = Date.now()): string {
  const day = startOfDay(date)
  const today = startOfDay(now)
  if (day === today) return 'Today'
  if (today - day === DAY) return 'Yesterday'
  const d = new Date(day)
  return d.getFullYear() === new Date(today).getFullYear()
    ? MONTH_DAY.format(d)
    : MONTH_DAY_YEAR.format(d)
}
