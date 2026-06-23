import type { Millis } from '@/types'

// Human-friendly interval between two timestamps, e.g. "<1m", "10m", "2h", "5d".
// Used on the grade buttons to preview the next due date per rating.
export function formatInterval(fromMs: Millis, toMs: Millis): string {
  const minutes = Math.max(0, toMs - fromMs) / 60_000
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${Math.round(minutes)}m`

  const hours = minutes / 60
  if (hours < 24) return `${Math.round(hours)}h`

  const days = hours / 24
  if (days < 30) return `${Math.round(days)}d`

  const months = days / 30
  if (months < 12) return `${Math.round(months)}mo`

  return `${(days / 365).toFixed(1)}y`
}
