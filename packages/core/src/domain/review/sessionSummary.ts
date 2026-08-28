import type { Millis, Rating, ReviewLog } from '../../types'
import { computeRetention } from '../stats/progressMetrics'
import { computeStreak } from '../stats/streak'

// What a finished review session can truthfully say about itself.
//
// Every field here is read straight out of the ReviewLogs the session just
// wrote - nothing is scored, weighted or invented, and there is no second
// currency underneath FSRS (docs/itera-decisions.md D209/D210). `recalled`
// reuses Progress's own `computeRetention`, so the completion screen and the
// Progress page can never disagree about what counts as a successful recall.

export interface SessionStreak {
  /** Current streak after this session, from the one shared computeStreak. */
  days: number
  /**
   * True only when the session itself moved the number: the same calculation
   * over history minus this session's logs yields a smaller streak. A learner
   * who had already studied earlier today gets `false`, correctly.
   */
  extendedToday: boolean
}

export interface SessionSummary {
  reviewed: number
  ratingCounts: Record<Rating, number>
  /**
   * Share of *mature* reviews graded Hard or better, by Progress's rule.
   * `null` when the session contained no mature review, which is honest: a
   * session of brand-new cards has no recall to measure yet.
   */
  recalled: number | null
  /** Time spent answering, summed per card. Not wall-clock: idle time is not study time. */
  focusMs: number
  /** Soonest moment any card from this session comes back, or null if unknown. */
  nextDueAt: Millis | null
  /** Cards that were new before this session and are no longer new. */
  firstTimeLearned: number
  streak: SessionStreak
}

const EMPTY_COUNTS = (): Record<Rating, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0 })

export function summarizeSession(
  sessionLogs: ReviewLog[],
  historyLogs: ReviewLog[],
  now: Millis = Date.now(),
): SessionSummary {
  const ratingCounts = EMPTY_COUNTS()
  let focusMs = 0
  let nextDueAt: Millis | null = null
  let firstTimeLearned = 0

  for (const log of sessionLogs) {
    ratingCounts[log.rating] = (ratingCounts[log.rating] ?? 0) + 1
    focusMs += Math.max(0, log.durationMs)
    if (log.dueAfter != null && (nextDueAt === null || log.dueAfter < nextDueAt)) {
      nextDueAt = log.dueAfter
    }
    if (log.stateBefore === 'new' && log.state !== 'new') firstTimeLearned++
  }

  // The caller's history may or may not have refetched yet, so union by id
  // rather than trusting either list to already contain the other.
  const sessionIds = new Set(sessionLogs.map((l) => l.id))
  const withoutSession = historyLogs.filter((l) => !sessionIds.has(l.id))
  const all = [...withoutSession, ...sessionLogs]

  const after = computeStreak(all, now).current
  const before = computeStreak(withoutSession, now).current

  return {
    reviewed: sessionLogs.length,
    ratingCounts,
    recalled: computeRetention(sessionLogs),
    focusMs,
    nextDueAt,
    firstTimeLearned,
    streak: { days: after, extendedToday: after > before },
  }
}

// Duration of a session, phrased the way a person would say it out loud.
// Deliberately coarse: sub-minute sessions read as seconds, everything else
// rounds to the minute, because a completion screen is not a stopwatch.
export function formatSessionDuration(ms: number): string {
  const seconds = Math.round(Math.max(0, ms) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes < 10 && rest >= 5) return `${minutes}m ${rest}s`
  return `${minutes}m`
}

// ---- Completion copy ----

// One line, in the Today greeting's voice (packages/core/src/today/greetings.ts):
// dry, precise, never congratulatory for its own sake, and never claiming more
// than the numbers support. Bucketed by what actually happened, so a rough
// session is not told it went well.
type Outcome = 'strong' | 'steady' | 'rough' | 'fresh'

function outcomeOf(summary: SessionSummary): Outcome {
  if (summary.recalled === null) return 'fresh'
  if (summary.recalled >= 0.9) return 'strong'
  if (summary.recalled >= 0.6) return 'steady'
  return 'rough'
}

export const SESSION_COMPLETE_LINES: Record<Outcome, string[]> = {
  strong: [
    'Clean pass. Most of that is staying put.',
    'Little friction on that one. The intervals just got longer.',
    'That went down easily. Come back when it is harder.',
  ],
  steady: [
    'Solid pass. A few of those will want another look.',
    'Good working session. Some of it is still bedding in.',
    'That is what steady looks like from the inside.',
  ],
  rough: [
    'Some of that fought back, which is exactly the part worth repeating.',
    'A harder pass. Those cards are queued sooner now, and that is the point.',
    'Not the easiest set. The scheduler noticed, so you do not have to.',
  ],
  fresh: [
    'New ground covered. The real test is the next pass.',
    'First contact with those. They will be back shortly.',
  ],
}

export function pickSessionCompleteLine(summary: SessionSummary, seed = Date.now()): string {
  const pool = SESSION_COMPLETE_LINES[outcomeOf(summary)]
  return pool[Math.abs(Math.floor(seed)) % pool.length]
}
