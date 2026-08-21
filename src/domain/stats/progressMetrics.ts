import type { Card, Deck, ID, Millis, ReviewLog } from '@/types'
import { leafDecks } from '@/domain/decks/tree'
import { DAY_MS, previousPeriod, startOfDay, type DateRange } from './dateRange'
import { computeLearned } from './learned'
import { computeStreak } from './streak'

const DAY = DAY_MS

function inRange(logs: ReviewLog[], range: DateRange): ReviewLog[] {
  return logs.filter((l) => l.reviewedAt >= range.from && l.reviewedAt < range.to)
}

// Mature retention: only reviews where the card was already in Review or
// Relearning before the grade are eligible. Hard, Good, and Easy are
// successes; Again is a failure. Today imports this same function.
export function computeRetention(logs: ReviewLog[]): number | null {
  const mature = logs.filter(
    (l) => l.stateBefore === 'review' || l.stateBefore === 'relearning',
  )
  if (!mature.length) return null
  return mature.filter((l) => l.rating >= 2).length / mature.length
}

const retentionOf = computeRetention

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function ppDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null
  return (current - previous) * 100
}

// ---- Sessions -------------------------------------------------------------

export interface StudySessionSpan {
  start: Millis
  end: Millis
  reviewCount: number
}

const DEFAULT_SESSION_GAP_MS = 30 * 60_000

// No session boundary is persisted anywhere (see docs/itera-decisions.md) —
// this reconstructs session spans by grouping consecutive reviews that are no
// more than `gapMs` apart. Approximate by construction; real product/data-
// model work to track sessions explicitly is a separate, larger change.
export function clusterSessions(
  logs: ReviewLog[],
  gapMs: number = DEFAULT_SESSION_GAP_MS,
): StudySessionSpan[] {
  if (!logs.length) return []
  const sorted = [...logs].sort((a, b) => a.reviewedAt - b.reviewedAt)
  const sessions: StudySessionSpan[] = []
  let start = sorted[0].reviewedAt
  let end = sorted[0].reviewedAt
  let count = 1
  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i].reviewedAt
    if (t - end > gapMs) {
      sessions.push({ start, end, reviewCount: count })
      start = t
      count = 0
    }
    end = t
    count++
  }
  sessions.push({ start, end, reviewCount: count })
  return sessions
}

// ---- KPI row ----------------------------------------------------------------

export interface KpiSet {
  learned: { value: number; total: number }
  due: number
  reviews: { value: number; deltaPct: number | null }
  retention: { value: number | null; deltaPp: number | null }
  streak: number
  bestStreak: number
}

export function computeKpis(
  cards: Card[],
  dueCards: Card[],
  logs: ReviewLog[],
  range: DateRange,
  now: Millis = Date.now(),
): KpiSet {
  const current = inRange(logs, range)
  const previous = inRange(logs, previousPeriod(range))

  const currentRetention = retentionOf(current)
  const previousRetention = retentionOf(previous)

  // Streak is deliberately independent of the selected range - it is always
  // "current" - and comes from the one shared definition in ./streak.
  const { current: streak, best: bestStreak } = computeStreak(logs, now)
  const learned = computeLearned(cards, logs)

  return {
    learned: {
      value: learned.learned,
      total: learned.total,
    },
    due: dueCards.length,
    reviews: { value: current.length, deltaPct: pctDelta(current.length, previous.length) },
    retention: { value: currentRetention, deltaPp: ppDelta(currentRetention, previousRetention) },
    streak,
    bestStreak,
  }
}

export interface ReviewCountPoint {
  bucketStart: Millis
  bucketEnd: Millis
  count: number
}

// Reviews per equal-width time bucket for the selected range. The KPI's
// sparkline therefore visualizes the same ReviewLog count the tile names.
export function computeReviewSeries(
  logs: ReviewLog[],
  range: DateRange,
  targetBuckets = 30,
): ReviewCountPoint[] {
  const bucketDays = Math.max(1, Math.ceil(range.days / targetBuckets))
  const bucketMs = bucketDays * DAY
  const points: ReviewCountPoint[] = []
  for (let start = range.from; start < range.to; start += bucketMs) {
    const end = Math.min(start + bucketMs, range.to)
    points.push({
      bucketStart: start,
      bucketEnd: end,
      count: logs.filter((log) => log.reviewedAt >= start && log.reviewedAt < end).length,
    })
  }
  return points
}

// ---- Activity heatmap -------------------------------------------------------

export interface HeatmapDay {
  date: Millis
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0 || max === 0) return 0
  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

export type HeatmapRangeValue = '7d' | '30d' | '3m' | '1y'

export const HEATMAP_RANGE_OPTIONS: { value: HeatmapRangeValue; label: string; days: number }[] = [
  { value: '7d', label: '7D', days: 7 },
  { value: '30d', label: '30D', days: 30 },
  { value: '3m', label: '3M', days: 90 },
  { value: '1y', label: '1Y', days: 365 },
]

export function heatmapDaysFor(value: HeatmapRangeValue): number {
  return HEATMAP_RANGE_OPTIONS.find((r) => r.value === value)?.days ?? 30
}

export function computeHeatmap(logs: ReviewLog[], days: number, now: Millis = Date.now()): HeatmapDay[] {
  const today = startOfDay(now)
  const from = today - (days - 1) * DAY
  const counts = new Map<Millis, number>()
  for (const log of logs) {
    const d = startOfDay(log.reviewedAt)
    if (d < from || d > today) continue
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  const max = Math.max(0, ...counts.values())
  const result: HeatmapDay[] = []
  for (let d = from; d <= today; d += DAY) {
    const count = counts.get(d) ?? 0
    result.push({ date: d, count, level: levelFor(count, max) })
  }
  return result
}

// ---- Retention over time ------------------------------------------------------

export interface RetentionPoint {
  bucketStart: Millis
  bucketEnd: Millis
  retention: number | null
}

// Buckets the range into ~`targetBuckets` equal-width windows and computes
// retention within each. `deckId` optionally scopes to one deck via the
// cardId -> deckId join (reviews on deleted cards, which resolve to no deck,
// are excluded when scoped, same as computeDeckPerformance below). The caller
// supplies the map so it is built once per render and spans both card stores
// (see domain/stats/cardDeckIndex).
export function computeRetentionSeries(
  logs: ReviewLog[],
  range: DateRange,
  cardDecks: Map<ID, ID>,
  deckIds?: ReadonlySet<ID>,
  targetBuckets = 10,
): RetentionPoint[] {
  let scoped = logs
  if (deckIds) {
    scoped = logs.filter((l) => {
      const deckId = cardDecks.get(l.cardId)
      return deckId !== undefined && deckIds.has(deckId)
    })
  }
  const bucketDays = Math.max(1, Math.round(range.days / targetBuckets))
  const bucketMs = bucketDays * DAY
  const points: RetentionPoint[] = []
  for (let start = range.from; start < range.to; start += bucketMs) {
    const end = Math.min(start + bucketMs, range.to)
    const bucketLogs = scoped.filter((l) => l.reviewedAt >= start && l.reviewedAt < end)
    points.push({ bucketStart: start, bucketEnd: end, retention: retentionOf(bucketLogs) })
  }
  return points
}

// ---- Deck performance table ---------------------------------------------------

export interface DeckPerformanceRow {
  deckId: ID
  learned: number
  active: number
  due: number
  retention: number | null
  lastReviewedAt?: Millis
}

export function computeDeckPerformance(
  logs: ReviewLog[],
  cards: Card[],
  dueCards: Card[],
  decks: Deck[],
  range: DateRange,
): DeckPerformanceRow[] {
  const current = inRange(logs, range)
  const dueIds = new Set(dueCards.map((card) => card.id))

  return leafDecks(decks)
    .map((deck): DeckPerformanceRow | null => {
      const activeCards = cards.filter((card) => card.deckId === deck.id && !card.suspended)
      if (activeCards.length === 0) return null
      const cardIds = new Set(activeCards.map((card) => card.id))
      const deckLogs = current.filter((log) => cardIds.has(log.cardId))
      const allDeckLogs = logs.filter((log) => cardIds.has(log.cardId))
      return {
        deckId: deck.id,
        learned: computeLearned(activeCards, logs).learned,
        active: activeCards.length,
        due: activeCards.filter((card) => dueIds.has(card.id)).length,
        retention: retentionOf(deckLogs),
        lastReviewedAt: allDeckLogs.length
          ? Math.max(...allDeckLogs.map((log) => log.reviewedAt))
          : undefined,
      }
    })
    .filter((row): row is DeckPerformanceRow => row !== null)
    .sort((a, b) => {
      const aActionable = a.due > 0 ? 1 : 0
      const bActionable = b.due > 0 ? 1 : 0
      if (aActionable !== bActionable) return bActionable - aActionable
      if (a.due !== b.due) return b.due - a.due
      if (a.retention !== null && b.retention !== null && a.retention !== b.retention) {
        return a.retention - b.retention
      }
      if ((a.retention === null) !== (b.retention === null)) {
        return a.retention === null ? 1 : -1
      }
      if ((a.lastReviewedAt ?? 0) !== (b.lastReviewedAt ?? 0)) {
        return (b.lastReviewedAt ?? 0) - (a.lastReviewedAt ?? 0)
      }
      const aName = decks.find((deck) => deck.id === a.deckId)?.name ?? ''
      const bName = decks.find((deck) => deck.id === b.deckId)?.name ?? ''
      return aName.localeCompare(bName)
    })
}

// ---- Milestones ---------------------------------------------------------------

export type MilestoneType = 'streak' | 'reviews' | 'retention'

export interface MilestoneEvent {
  type: MilestoneType
  threshold: number
  date: Millis
  title: string
  subtitle: string
}

const STREAK_THRESHOLDS = [3, 7, 14, 30, 60, 100]
const REVIEW_THRESHOLDS = [100, 500, 1000, 2500, 5000, 10000]
const RETENTION_THRESHOLDS = [0.7, 0.8, 0.9]

// Derives milestone-like events purely from ReviewLog history — no
// milestone/achievement entity exists (see docs/itera-decisions.md), so this
// is entirely recomputed each time rather than tracked incrementally. Three
// families: cumulative review-count thresholds, streak-length thresholds, and
// trailing-30-day retention thresholds, each dated at the first log/day that
// crossed them.
export function deriveMilestones(logs: ReviewLog[]): MilestoneEvent[] {
  if (!logs.length) return []
  const sorted = [...logs].sort((a, b) => a.reviewedAt - b.reviewedAt)
  const events: MilestoneEvent[] = []

  for (const threshold of REVIEW_THRESHOLDS) {
    if (sorted.length >= threshold) {
      events.push({
        type: 'reviews',
        threshold,
        date: sorted[threshold - 1].reviewedAt,
        title: `${threshold.toLocaleString()} cards reviewed`,
        subtitle: 'Big milestone',
      })
    }
  }

  const days = [...new Set(sorted.map((l) => startOfDay(l.reviewedAt)))].sort((a, b) => a - b)

  let run = 0
  let prevDay: Millis | null = null
  const crossedStreak = new Set<number>()
  for (const d of days) {
    run = prevDay !== null && d - prevDay === DAY ? run + 1 : 1
    prevDay = d
    for (const threshold of STREAK_THRESHOLDS) {
      if (run === threshold && !crossedStreak.has(threshold)) {
        crossedStreak.add(threshold)
        events.push({
          type: 'streak',
          threshold,
          date: d,
          title: `${threshold}-day streak`,
          subtitle: threshold >= 30 ? 'Outstanding consistency' : 'Keep it going',
        })
      }
    }
  }

  const crossedRetention = new Set<number>()
  for (const day of days) {
    const windowStart = day - 30 * DAY
    const windowLogs = sorted.filter((l) => l.reviewedAt >= windowStart && l.reviewedAt < day + DAY)
    const r = retentionOf(windowLogs)
    if (r === null) continue
    for (const threshold of RETENTION_THRESHOLDS) {
      if (r >= threshold && !crossedRetention.has(threshold)) {
        crossedRetention.add(threshold)
        events.push({
          type: 'retention',
          threshold,
          date: day,
          title: `${Math.round(threshold * 100)}% retention`,
          subtitle: 'Great recall',
        })
      }
    }
  }

  return events.sort((a, b) => b.date - a.date)
}
