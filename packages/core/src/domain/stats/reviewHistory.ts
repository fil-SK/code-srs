import type { Deck, ID, Millis, Rating, ReviewLog } from '../../types'
import { subtreeIds } from '../decks/tree'
import type { DateRange } from './dateRange'
import { addCalendarDays } from './calendarDay'

// Review history's own range presets, deliberately *not* DATE_RANGE_PRESETS.
// Overview's presets feed period-over-period deltas, where an unbounded window
// is meaningless; a history list has the opposite requirement, since an SRS
// app's whole point is that usage spans years. Same local-union shape
// ActivityHeatmap already uses for its own toggle.
export type HistoryRangeValue = '30d' | '3m' | '1y' | 'all'

export const HISTORY_RANGE_OPTIONS: { value: HistoryRangeValue; label: string }[] = [
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

const RANGE_DAYS: Record<Exclude<HistoryRangeValue, 'all'>, number> = {
  '30d': 30,
  '3m': 90,
  '1y': 365,
}

// `null` means "no date filter at all". `to` is exclusive, matching
// dateRange.buildRange, so a review logged any time today is included.
export function buildHistoryRange(
  value: HistoryRangeValue,
  now: Millis = Date.now(),
): DateRange | null {
  if (value === 'all') return null
  const days = RANGE_DAYS[value]
  const to = addCalendarDays(now, 1)
  return { from: addCalendarDays(to, -days), to, days }
}

export interface ReviewHistoryRow {
  id: ID
  reviewedAt: Millis
  rating: Rating
  autoGraded: boolean
  durationMs: number
  dueAfter?: Millis // absent on rows logged before the field existed
  cardId: ID
  deckId: ID | null // null when the card no longer exists in either store
}

export interface ReviewHistoryFilter {
  range: DateRange | null
  deckId?: ID // undefined = all decks; scopes to the deck *and* its subtree
  rating?: Rating // undefined = all ratings
}

// One row per review, newest first. Reviews whose card has since been deleted
// are deliberately *kept* (with `deckId: null`) - this is a record of what was
// studied, and dropping rows would misrepresent it. That is the opposite of
// computeDeckPerformance, which must skip them because it groups by deck.
export function buildReviewHistory(
  logs: ReviewLog[],
  cardDecks: Map<ID, ID>,
  decks: Deck[],
  filter: ReviewHistoryFilter,
): ReviewHistoryRow[] {
  const { range, deckId, rating } = filter
  const scopeIds = deckId ? new Set(subtreeIds(decks, deckId)) : null

  const rows: ReviewHistoryRow[] = []
  for (const log of logs) {
    if (range && (log.reviewedAt < range.from || log.reviewedAt >= range.to)) continue
    if (rating !== undefined && log.rating !== rating) continue

    const resolved = cardDecks.get(log.cardId) ?? null
    if (scopeIds && (resolved === null || !scopeIds.has(resolved))) continue

    rows.push({
      id: log.id,
      reviewedAt: log.reviewedAt,
      rating: log.rating,
      autoGraded: log.autoGraded,
      durationMs: log.durationMs,
      dueAfter: log.dueAfter,
      cardId: log.cardId,
      deckId: resolved,
    })
  }

  // Ties broken by id so paging is stable when several reviews share a
  // timestamp (auto-graded runs can land in the same millisecond).
  return rows.sort((a, b) => b.reviewedAt - a.reviewedAt || a.id.localeCompare(b.id))
}
