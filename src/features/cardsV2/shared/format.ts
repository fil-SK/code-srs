// Small formatting helpers for CardV2 due/last-studied display. Promoted into
// production once the real Deck page needed them too (see
// docs/itera-decisions.md).

export function formatLastStudied(ms: number | undefined, now: number): string {
  if (ms == null) return 'Never'
  const diff = now - ms
  const hour = 60 * 60 * 1000
  const day = 24 * hour
  if (diff < hour) return 'Just now'
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  const days = Math.floor(diff / day)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function formatDue(due: number | undefined, now: number): string {
  if (due == null) return '—'
  const day = 24 * 60 * 60 * 1000
  const diff = due - now
  if (diff <= 0) return 'Due now'
  const days = Math.round(diff / day)
  return days <= 1 ? 'in 1 day' : `in ${days} days`
}
