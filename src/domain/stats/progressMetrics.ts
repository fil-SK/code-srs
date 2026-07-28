import type { Card, ID, Millis, ReviewLog } from '@/types'
import { previousPeriod, type DateRange } from './dateRange'

const DAY = 86_400_000

function startOfDay(ms: Millis): Millis {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function inRange(logs: ReviewLog[], range: DateRange): ReviewLog[] {
  return logs.filter((l) => l.reviewedAt >= range.from && l.reviewedAt < range.to)
}

// Mature-card recall: of reviews on cards already in FSRS's review/relearning
// state, the share rated Hard/Good/Easy (not Again). Matches
// computeStats.ts's definition, just parametrized by an arbitrary window
// instead of a fixed trailing 30 days.
function retentionOf(logs: ReviewLog[]): number | null {
  const mature = logs.filter((l) => l.state === 'review' || l.state === 'relearning')
  if (!mature.length) return null
  return mature.filter((l) => l.rating >= 2).length / mature.length
}

// Accuracy: the same "not Again" success rate, but over *all* reviews in the
// window regardless of card state (new/learning cards count too). Deliberately
// broader than retention — it reads as the higher of the two numbers, since
// early-stage reviews are easier to answer correctly than mature recall
// checks.
function accuracyOf(logs: ReviewLog[]): number | null {
  if (!logs.length) return null
  return logs.filter((l) => l.rating >= 2).length / logs.length
}

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

// ---- Streaks ----------------------------------------------------------------

function calcStreaks(logs: ReviewLog[], now: Millis): { streak: number; bestStreak: number } {
  const days = [...new Set(logs.map((l) => startOfDay(l.reviewedAt)))].sort((a, b) => a - b)
  const daySet = new Set(days)

  // Current streak: consecutive days with a review, counting back from today
  // (with a one-day grace so it doesn't drop to 0 until today's review log is
  // written). Independent of any selected date range — it's always "current".
  let streak = 0
  let cursor = startOfDay(now)
  if (!daySet.has(cursor)) cursor -= DAY
  while (daySet.has(cursor)) {
    streak++
    cursor -= DAY
  }

  // Best-ever streak: longest run of consecutive calendar days across all
  // history.
  let bestStreak = 0
  let run = 0
  let prevDay: Millis | null = null
  for (const d of days) {
    run = prevDay !== null && d - prevDay === DAY ? run + 1 : 1
    if (run > bestStreak) bestStreak = run
    prevDay = d
  }

  return { streak, bestStreak }
}

// ---- KPI row ----------------------------------------------------------------

export interface KpiSet {
  totalSessions: { value: number; deltaPct: number | null }
  cardsReviewed: { value: number; deltaPct: number | null }
  retention: { value: number | null; deltaPp: number | null }
  accuracy: { value: number | null; deltaPp: number | null }
  streak: number
  bestStreak: number
}

export function computeKpis(logs: ReviewLog[], range: DateRange, now: Millis = Date.now()): KpiSet {
  const current = inRange(logs, range)
  const previous = inRange(logs, previousPeriod(range))

  const currentSessions = clusterSessions(current).length
  const previousSessions = clusterSessions(previous).length

  const currentRetention = retentionOf(current)
  const previousRetention = retentionOf(previous)
  const currentAccuracy = accuracyOf(current)
  const previousAccuracy = accuracyOf(previous)

  const { streak, bestStreak } = calcStreaks(logs, now)

  return {
    totalSessions: { value: currentSessions, deltaPct: pctDelta(currentSessions, previousSessions) },
    cardsReviewed: { value: current.length, deltaPct: pctDelta(current.length, previous.length) },
    retention: { value: currentRetention, deltaPp: ppDelta(currentRetention, previousRetention) },
    accuracy: { value: currentAccuracy, deltaPp: ppDelta(currentAccuracy, previousAccuracy) },
    streak,
    bestStreak,
  }
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

// ---- Deck join helpers -------------------------------------------------------

function cardDeckMap(cards: Card[]): Map<ID, ID> {
  return new Map(cards.map((c) => [c.id, c.deckId]))
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
// are excluded when scoped, same as computeDeckPerformance below).
export function computeRetentionSeries(
  logs: ReviewLog[],
  range: DateRange,
  cards: Card[],
  deckId?: ID,
  targetBuckets = 10,
): RetentionPoint[] {
  let scoped = logs
  if (deckId) {
    const map = cardDeckMap(cards)
    scoped = logs.filter((l) => map.get(l.cardId) === deckId)
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
  reviewed: number
  retention: number | null
  accuracy: number | null
  // Accuracy across a handful of equal-size chronological chunks of this
  // deck's reviews in range — enough to draw a small trend sparkline. Not a
  // time-bucketed series (chunks are by review count, not by day), since
  // low-volume decks would otherwise produce mostly-empty buckets.
  trendSeries: number[]
}

function bucketedAccuracySeries(deckLogs: ReviewLog[], buckets = 6): number[] {
  if (!deckLogs.length) return []
  const sorted = [...deckLogs].sort((a, b) => a.reviewedAt - b.reviewedAt)
  const chunkSize = Math.max(1, Math.ceil(sorted.length / buckets))
  const series: number[] = []
  for (let i = 0; i < sorted.length; i += chunkSize) {
    series.push(accuracyOf(sorted.slice(i, i + chunkSize)) ?? 0)
  }
  return series
}

export function computeDeckPerformance(
  logs: ReviewLog[],
  cards: Card[],
  range: DateRange,
): DeckPerformanceRow[] {
  const map = cardDeckMap(cards)
  const current = inRange(logs, range)
  const byDeck = new Map<ID, ReviewLog[]>()
  for (const log of current) {
    const deckId = map.get(log.cardId)
    if (!deckId) continue // card deleted since review — can't attribute to a deck
    const arr = byDeck.get(deckId)
    if (arr) arr.push(log)
    else byDeck.set(deckId, [log])
  }
  const rows: DeckPerformanceRow[] = []
  for (const [deckId, deckLogs] of byDeck) {
    rows.push({
      deckId,
      reviewed: deckLogs.length,
      retention: retentionOf(deckLogs),
      accuracy: accuracyOf(deckLogs),
      trendSeries: bucketedAccuracySeries(deckLogs),
    })
  }
  return rows.sort((a, b) => b.reviewed - a.reviewed)
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
