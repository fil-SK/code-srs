import type { Card, Millis, ReviewLog } from '@/types'

const DAY = 86_400_000

function startOfDay(ms: Millis): Millis {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export interface Stats {
  totalReviews: number
  reviewsLast30: number
  reviewsPerDay: number[] // last 14 days, oldest first (index 13 = today)
  retention: number | null // 0..1 over mature reviews in last 30d, or null if none
  streak: number // consecutive days with >=1 review (today, or grace from yesterday)
  forecast: number[] // due-card counts for the next 7 days (index 0 = today, incl. overdue)
}

// All stats are derived from the review log + current cards — nothing is stored.
export function computeStats(
  logs: ReviewLog[],
  cards: Card[],
  now: Millis = Date.now(),
): Stats {
  const today = startOfDay(now)

  // Reviews per day for the last 14 days.
  const perDay = new Array(14).fill(0)
  for (const log of logs) {
    const idx = Math.round((today - startOfDay(log.reviewedAt)) / DAY)
    if (idx >= 0 && idx < 14) perDay[13 - idx]++
  }

  // Retention over mature (review/relearning) reviews in the last 30 days.
  const cutoff = now - 30 * DAY
  const recent = logs.filter((l) => l.reviewedAt >= cutoff)
  const mature = recent.filter(
    (l) => l.state === 'review' || l.state === 'relearning',
  )
  const retention = mature.length
    ? mature.filter((l) => l.rating >= 2).length / mature.length
    : null

  // Streak: consecutive days with a review, counting back from today (with a
  // one-day grace so a streak isn't shown as 0 until you review today).
  const reviewDays = new Set(logs.map((l) => startOfDay(l.reviewedAt)))
  let streak = 0
  let cursor = today
  if (!reviewDays.has(cursor)) cursor -= DAY
  while (reviewDays.has(cursor)) {
    streak++
    cursor -= DAY
  }

  // Forecast: due cards over the next 7 days; overdue rolls into today.
  const forecast = new Array(7).fill(0)
  for (const card of cards) {
    if (card.suspended) continue
    let idx = Math.round((startOfDay(card.scheduling.due) - today) / DAY)
    if (idx < 0) idx = 0
    if (idx >= 0 && idx < 7) forecast[idx]++
  }

  return {
    totalReviews: logs.length,
    reviewsLast30: recent.length,
    reviewsPerDay: perDay,
    retention,
    streak,
    forecast,
  }
}
