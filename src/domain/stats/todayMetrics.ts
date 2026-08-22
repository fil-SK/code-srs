import type { Card, Deck, ID, Millis, ReviewLog } from '@/types'
import { leafDecks } from '@/domain/decks/tree'
import { addCalendarDays, eachCalendarDay, localDayIndex } from './calendarDay'
import { metricsFor, type DeckMetrics } from './deckMetrics'
import { computeLearned } from './learned'

// Everything Today displays, as pure functions over already-fetched entities.
//
// Today used to compute nothing: each panel carried illustrative literals
// (24 cards / 15 minutes / "4 of 5 sessions" / a seven-point minute series).
// This module is the replacement boundary - UI -> hooks -> here -> Repository -
// so no learning statistic is calculated inside a component, and so each rule
// below is unit-testable against a fixed `now` instead of the machine clock.
//
// Nothing here invents a concept. Due-card semantics come from the same
// repository query /review uses, deck metrics from ./deckMetrics, streaks from
// ./streak and retention from ./progressMetrics.

// ---- Suggested session: what is actually due -------------------------------

export interface DueQueueSummary {
  dueCount: number
  /** Names of the decks contributing to the queue, in queue order. */
  deckNames: string[]
  /** Contributing decks beyond `deckNames` - rendered as "+N more". */
  extraDeckCount: number
}

// The hero's subtitle line. Decks appear in the order their first due card
// appears in the queue (the repository returns due cards sorted by due date),
// which makes the list deterministic rather than presentation-random. A card
// whose deckId resolves to no owned deck contributes to the count but never to
// the names - Today must not print a deck the user does not have.
export function summarizeDueQueue(
  dueCards: Card[],
  decks: Deck[],
  maxNames = 3,
): DueQueueSummary {
  const nameById = new Map(decks.map((d) => [d.id, d.name]))
  const seen = new Set<ID>()
  const contributing: string[] = []

  for (const card of dueCards) {
    if (seen.has(card.deckId)) continue
    seen.add(card.deckId)
    const name = nameById.get(card.deckId)
    if (name) contributing.push(name)
  }

  return {
    dueCount: dueCards.length,
    deckNames: contributing.slice(0, maxNames),
    extraDeckCount: Math.max(0, contributing.length - maxNames),
  }
}

// ---- Suggested session: how long it is likely to take ----------------------

/** Used when review history is too thin to measure the learner's own pace. */
export const DEFAULT_SECONDS_PER_CARD = 20
/** Below this many usable samples the fallback is more honest than the data. */
export const MIN_DURATION_SAMPLE = 10
const DURATION_WINDOW = 200
const MIN_USABLE_DURATION_MS = 1_000
const MAX_USABLE_DURATION_MS = 5 * 60_000

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// An estimate, and labelled as one in the UI ("Approximately N minutes").
//
// Median rather than mean, over the most recent DURATION_WINDOW reviews: a
// single card left open on a background tab would otherwise drag every future
// estimate upward for a long time. Durations outside 1s-5min are discarded for
// the same reason (below 1s is a mis-click, above 5min is a walk away, neither
// describes how fast this learner reviews).
export function estimateSessionMinutes(logs: ReviewLog[], cardCount: number): number {
  if (cardCount <= 0) return 0

  const usable = [...logs]
    .sort((a, b) => b.reviewedAt - a.reviewedAt)
    .filter((l) => l.durationMs >= MIN_USABLE_DURATION_MS && l.durationMs <= MAX_USABLE_DURATION_MS)
    .slice(0, DURATION_WINDOW)
    .map((l) => l.durationMs)

  const perCardMs =
    usable.length >= MIN_DURATION_SAMPLE ? median(usable) : DEFAULT_SECONDS_PER_CARD * 1_000

  return Math.max(1, Math.round((cardCount * perCardMs) / 60_000))
}

/** Earliest future due instant among schedulable cards, for the caught-up hero. */
export function nextDueAt(cards: Card[], now: Millis): Millis | undefined {
  let earliest: Millis | undefined
  for (const card of cards) {
    if (card.suspended) continue
    const due = card.scheduling.due
    if (due <= now) continue
    if (earliest === undefined || due < earliest) earliest = due
  }
  return earliest
}

// ---- Pace: reviews completed per local calendar day ------------------------

export interface PaceDay {
  date: Millis
  /** Single-letter weekday, matching the chart's existing axis. */
  label: string
  count: number
  isToday: boolean
}

const WEEKDAY_INITIAL = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' })

// Exactly seven local-day buckets ending with today, zero-review days
// included. Pace counts *reviews completed*, not minutes: no goal or target
// exists in this product, and durationMs is deliberately not consulted here -
// it backs the session estimate above and nothing else.
export function computePaceSeries(logs: ReviewLog[], now: Millis): PaceDay[] {
  const todayIndex = localDayIndex(now)
  const fromIndex = todayIndex - 6

  // Keyed by calendar-day index rather than by a millisecond midnight, so a
  // review on a 23- or 25-hour local day still lands in that day's bucket.
  const counts = new Map<number, number>()
  for (const log of logs) {
    const day = localDayIndex(log.reviewedAt)
    if (day < fromIndex || day > todayIndex) continue
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  return eachCalendarDay(addCalendarDays(now, -6), 7).map((date) => {
    const index = localDayIndex(date)
    return {
      date,
      label: WEEKDAY_INITIAL.format(new Date(date)),
      count: counts.get(index) ?? 0,
      isToday: index === todayIndex,
    }
  })
}

// ---- Continue learning -----------------------------------------------------

export interface ContinueRow {
  deckId: ID
  name: string
  description?: string
  dueCount: number
  masteryFraction: number
  lastStudied?: Millis
}

// "What should I continue working on?" - so the ordering is about continuity
// among decks that can actually be worked on right now:
//   1. decks with due cards before decks with none,
//   2. among those, most recently studied first,
//   3. then the larger backlog,
//   4. then name, purely so the result is deterministic.
// A neglected 100-card backlog therefore cannot permanently outrank the deck
// the learner was in yesterday, and a deck with nothing due can never outrank
// one with real work waiting.
//
// Leaf decks only, matching the Library's own split between browsable decks
// and UI-only "Collections": a ranked list whose rows overlapped (a parent and
// its child both listed, one containing the other's work) would be unreadable.
// The tradeoff, deliberately accepted: cards filed directly on a deck that has
// children get no row of their own here. They are still counted everywhere the
// total matters (the hero, Due today) and are reachable from the Adjust
// session dialog, which does list parent decks because that is an explicit
// choice rather than a ranking.
export function buildContinueLearning(
  decks: Deck[],
  metrics: Map<ID, DeckMetrics>,
  limit = 4,
): ContinueRow[] {
  return leafDecks(decks)
    .map((deck) => {
      const m = metricsFor(metrics, deck.id)
      return {
        deckId: deck.id,
        name: deck.name,
        description: deck.description,
        dueCount: m.dueCount,
        masteryFraction: m.masteryFraction,
        lastStudied: m.lastStudied,
      }
    })
    .sort(compareContinueRows)
    .slice(0, limit)
}

function compareContinueRows(a: ContinueRow, b: ContinueRow): number {
  const aActionable = a.dueCount > 0 ? 1 : 0
  const bActionable = b.dueCount > 0 ? 1 : 0
  if (aActionable !== bActionable) return bActionable - aActionable
  if ((a.lastStudied ?? 0) !== (b.lastStudied ?? 0)) {
    return (b.lastStudied ?? 0) - (a.lastStudied ?? 0)
  }
  if (a.dueCount !== b.dueCount) return b.dueCount - a.dueCount
  return a.name.localeCompare(b.name)
}

// ---- Next milestone --------------------------------------------------------

export type NextMilestone =
  | {
      kind: 'finish-deck'
      deckId: ID
      name: string
      learned: number
      total: number
      /** Carried so the row can link at a session only when one exists. */
      dueCount: number
    }
  | { kind: 'start-deck'; deckId: ID; name: string; dueCount: number }
  | { kind: 'review-deck'; deckId: ID; name: string; dueCount: number }

interface DeckLearning {
  deck: Deck
  /**
   * Current, non-suspended cards in the deck that have received at least one
   * review. NOT a ReviewLog count, and explicitly NOT a mastery claim - one
   * review is one review.
   */
  learned: number
  /** Current, non-suspended cards in the deck. */
  total: number
  /** Most recent review of a card that currently belongs to this deck. */
  lastReviewedAt?: Millis
}

// Cards are attributed to the deck they are in *now*, matching the convention
// buildCardDeckMap sets for every other deck-scoped statistic - a card moved
// between decks takes its history with it.
function summarizeDeckLearning(decks: Deck[], cards: Card[], logs: ReviewLog[]): DeckLearning[] {
  const deckOfCard = new Map(cards.map((c) => [c.id, c.deckId]))

  const lastReviewed = new Map<ID, Millis>()
  for (const log of logs) {
    const deckId = deckOfCard.get(log.cardId)
    if (!deckId) continue // card deleted since the review
    const current = lastReviewed.get(deckId)
    if (current === undefined || log.reviewedAt > current) lastReviewed.set(deckId, log.reviewedAt)
  }

  return decks.map((deck) => {
    const learned = computeLearned(
      cards,
      logs,
      new Set([deck.id]),
    )
    return {
      deck,
      ...learned,
      lastReviewedAt: lastReviewed.get(deck.id),
    }
  })
}

/** A deck is in progress when some, but not all, of its active cards are learned. */
function isInProgress(d: DeckLearning): boolean {
  return d.learned > 0 && d.learned < d.total
}

// Derived, not persisted: there is no milestone or achievement entity in this
// product, and this milestone deliberately did not add one. The MVP meaning is
// "help the learner finish the deck they are already working through".
//
// First choice is the most recently reviewed *in-progress* deck - the deck
// holding the single most recent review is skipped when it is already fully
// learned, so finishing a deck does not pin the milestone to it. With nothing
// in progress the row falls back to the most actionable deck (the same
// due-first principle Continue Learning uses), and with nothing suitable at
// all it returns null so the row can say so honestly.
export function selectNextMilestone(
  decks: Deck[],
  cards: Card[],
  logs: ReviewLog[],
  metrics: Map<ID, DeckMetrics>,
): NextMilestone | null {
  const summaries = summarizeDeckLearning(leafDecks(decks), cards, logs)

  const inProgress = summaries.filter(isInProgress).sort((a, b) => {
    const diff = (b.lastReviewedAt ?? 0) - (a.lastReviewedAt ?? 0)
    return diff !== 0 ? diff : a.deck.name.localeCompare(b.deck.name)
  })

  const best = inProgress[0]
  if (best) {
    return {
      kind: 'finish-deck',
      deckId: best.deck.id,
      name: best.deck.name,
      learned: best.learned,
      total: best.total,
      dueCount: metricsFor(metrics, best.deck.id).dueCount,
    }
  }

  const rows = buildContinueLearning(decks, metrics, Number.MAX_SAFE_INTEGER)
  const actionable = rows.find((r) => r.dueCount > 0)
  if (!actionable) return null

  const summary = summaries.find((s) => s.deck.id === actionable.deckId)
  return {
    kind: summary && summary.learned > 0 ? 'review-deck' : 'start-deck',
    deckId: actionable.deckId,
    name: actionable.name,
    dueCount: actionable.dueCount,
  }
}

// ---- Adjust session --------------------------------------------------------

// Parses the `limit` query parameter shared by the Adjust session dialog and
// /review. Anything that is not a positive integer means "no limit" rather
// than an error state: a malformed URL should still start a usable session.
export function resolveSessionLimit(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined || raw.trim() === '') return undefined
  if (!/^\d+$/.test(raw.trim())) return undefined
  const value = Number(raw.trim())
  if (!Number.isSafeInteger(value) || value <= 0) return undefined
  return value
}
