import { describe, expect, it } from 'vitest'
import type { ReviewLog, SchedulingStateKind } from '../../types'
import {
  formatSessionDuration,
  pickSessionCompleteLine,
  SESSION_COMPLETE_LINES,
  summarizeSession,
} from './sessionSummary'

const DAY = 86_400_000
const NOW = new Date('2026-08-28T12:00:00').getTime()

function log(
  id: string,
  over: Partial<ReviewLog> & { rating: ReviewLog['rating'] },
  stateBefore: SchedulingStateKind = 'review',
): ReviewLog {
  return {
    id,
    cardId: 'card-' + id,
    reviewedAt: NOW,
    autoGraded: false,
    durationMs: 10_000,
    stabilityBefore: 5,
    stabilityAfter: 6,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore,
    state: 'review',
    ...over,
  }
}

describe('summarizeSession', () => {
  it('counts each rating and sums only the time spent answering', () => {
    const s = summarizeSession(
      [
        log('a', { rating: 3, durationMs: 4_000 }),
        log('b', { rating: 3, durationMs: 6_000 }),
        log('c', { rating: 1, durationMs: 20_000 }),
      ],
      [],
      NOW,
    )
    expect(s.reviewed).toBe(3)
    expect(s.ratingCounts).toEqual({ 1: 1, 2: 0, 3: 2, 4: 0 })
    expect(s.focusMs).toBe(30_000)
  })

  it('measures recall with the same rule as Progress retention', () => {
    // Hard or better on a mature card is a success; Again is a failure.
    const s = summarizeSession(
      [log('a', { rating: 2 }), log('b', { rating: 4 }), log('c', { rating: 1 })],
      [],
      NOW,
    )
    expect(s.recalled).toBeCloseTo(2 / 3)
  })

  it('reports no recall figure at all when nothing in the session was mature', () => {
    const s = summarizeSession([log('a', { rating: 3 }, 'new'), log('b', { rating: 3 }, 'learning')], [], NOW)
    expect(s.recalled).toBeNull()
  })

  it('counts a card that stopped being new as first-time learned', () => {
    const s = summarizeSession(
      [log('a', { rating: 3 }, 'new'), log('b', { rating: 3 }, 'new'), log('c', { rating: 3 })],
      [],
      NOW,
    )
    expect(s.firstTimeLearned).toBe(2)
  })

  it('takes the soonest next-due across the session, ignoring logs without one', () => {
    const s = summarizeSession(
      [
        log('a', { rating: 3, dueAfter: NOW + 5 * DAY }),
        log('b', { rating: 1, dueAfter: NOW + 600_000 }),
        log('c', { rating: 3 }),
      ],
      [],
      NOW,
    )
    expect(s.nextDueAt).toBe(NOW + 600_000)
  })

  it('marks the streak as extended only when this session is what moved it', () => {
    const history = [log('h1', { rating: 3, reviewedAt: NOW - DAY })]
    const extended = summarizeSession([log('a', { rating: 3 })], history, NOW)
    expect(extended.streak).toEqual({ days: 2, extendedToday: true })

    // Already studied earlier today: the session adds reviews, not a day.
    const alreadyToday = [...history, log('h2', { rating: 3, reviewedAt: NOW - 3_600_000 })]
    const kept = summarizeSession([log('a', { rating: 3 })], alreadyToday, NOW)
    expect(kept).toMatchObject({ streak: { days: 2, extendedToday: false } })
  })

  it('does not double-count session logs that history already contains', () => {
    const shared = log('a', { rating: 3 })
    const s = summarizeSession([shared], [shared], NOW)
    expect(s.streak.days).toBe(1)
    expect(s.streak.extendedToday).toBe(true)
  })
})

describe('formatSessionDuration', () => {
  it('reads as seconds below a minute and as minutes above it', () => {
    expect(formatSessionDuration(0)).toBe('0s')
    expect(formatSessionDuration(42_000)).toBe('42s')
    expect(formatSessionDuration(65_000)).toBe('1m 5s')
    expect(formatSessionDuration(120_000)).toBe('2m')
    expect(formatSessionDuration(15 * 60_000 + 30_000)).toBe('15m')
  })

  it('never reports negative time', () => {
    expect(formatSessionDuration(-5_000)).toBe('0s')
  })
})

describe('pickSessionCompleteLine', () => {
  it('never tells a rough session that it went well', () => {
    const rough = summarizeSession(
      [log('a', { rating: 1 }), log('b', { rating: 1 }), log('c', { rating: 3 })],
      [],
      NOW,
    )
    expect(SESSION_COMPLETE_LINES.rough).toContain(pickSessionCompleteLine(rough, 0))
  })

  it('uses the new-material voice when there is no recall to report', () => {
    const fresh = summarizeSession([log('a', { rating: 3 }, 'new')], [], NOW)
    expect(SESSION_COMPLETE_LINES.fresh).toContain(pickSessionCompleteLine(fresh, 7))
  })

  it('returns a line for any seed', () => {
    const strong = summarizeSession([log('a', { rating: 4 }), log('b', { rating: 3 })], [], NOW)
    for (const seed of [0, 1, 2, 3, 999, Date.now()]) {
      expect(SESSION_COMPLETE_LINES.strong).toContain(pickSessionCompleteLine(strong, seed))
    }
  })
})
