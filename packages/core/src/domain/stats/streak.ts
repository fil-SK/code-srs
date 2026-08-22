import type { Millis, ReviewLog } from '../../types'
import { localDayIndex } from './calendarDay'

export interface StreakSummary {
  /** Consecutive local days with at least one review, counting back from today. */
  current: number
  /** Longest such run anywhere in history. */
  best: number
  /** Whether today's bucket already has a review. */
  activeToday: boolean
}

// The single streak definition in the product. Today's Momentum panel, the
// top-nav StreakBadge and Progress's KPI tile all call this with the same
// ReviewLog array, so the three surfaces cannot disagree - they may present it
// differently (compact vs. current+best), but the number is one calculation.
//
// Grace behavior, deliberately preserved from the original Progress
// implementation: a learner who studied through yesterday but has not studied
// yet today still has an active streak. The cursor starts at today and steps
// back one day when today is empty, so the count only drops to 0 once a full
// local calendar day has actually been missed.
//
// Days are compared as calendar-day indices, never as elapsed milliseconds: a
// local day is 23 or 25 hours on the two DST transition days, and counting in
// 24-hour steps truncated real streaks that crossed one.
export function computeStreak(logs: ReviewLog[], now: Millis = Date.now()): StreakSummary {
  const days = [...new Set(logs.map((l) => localDayIndex(l.reviewedAt)))].sort((a, b) => a - b)
  const daySet = new Set(days)

  const today = localDayIndex(now)
  const activeToday = daySet.has(today)

  let current = 0
  let cursor = activeToday ? today : today - 1
  while (daySet.has(cursor)) {
    current++
    cursor--
  }

  let best = 0
  let run = 0
  let prevDay: number | null = null
  for (const d of days) {
    run = prevDay !== null && d === prevDay + 1 ? run + 1 : 1
    if (run > best) best = run
    prevDay = d
  }

  return { current, best, activeToday }
}

// The three streak surfaces share one calculation, so they share its wording
// too - Progress's Best footer used to hard-code the plural and read
// "Best: 1 days".
export function formatDayCount(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}
