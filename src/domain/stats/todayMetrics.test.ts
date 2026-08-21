import { describe, expect, it } from 'vitest'
import type { Card, Deck, ReviewLog, SchedulingState } from '@/types'
import { computeDeckMetrics } from './deckMetrics'
import {
  DEFAULT_SECONDS_PER_CARD,
  buildContinueLearning,
  computePaceSeries,
  estimateSessionMinutes,
  nextDueAt,
  resolveSessionLimit,
  selectNextMilestone,
  summarizeDueQueue,
} from './todayMetrics'

const NOW = new Date(2026, 7, 18, 14, 30).getTime() // 2026-08-18, local
const HOUR = 3_600_000
const DAY = 86_400_000

function at(daysAgo: number, hour = 10): number {
  return new Date(2026, 7, 18 - daysAgo, hour, 0).getTime()
}

function scheduling(overrides: Partial<SchedulingState> = {}): SchedulingState {
  return {
    due: NOW - HOUR,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    learningSteps: 0,
    state: 'review',
    ...overrides,
  }
}

function card(id: string, deckId: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    schemaVersion: 2,
    deckId,
    prompt: { format: 'markdown', value: id },
    interaction: { type: 'recall', answer: { format: 'markdown', value: 'a' } },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling: scheduling(),
    ...overrides,
  }
}

function deck(id: string, name: string, overrides: Partial<Deck> = {}): Deck {
  return { id, name, createdAt: 0, updatedAt: 0, ...overrides }
}

function log(cardId: string, daysAgo: number, overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: `${cardId}-${daysAgo}-${overrides.durationMs ?? 'd'}-${Math.random()}`,
    cardId,
    reviewedAt: at(daysAgo),
    rating: 3,
    autoGraded: false,
    durationMs: 8_000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    state: 'review',
    ...overrides,
  }
}

// ---- summarizeDueQueue -------------------------------------------------------

describe('summarizeDueQueue', () => {
  const decks = [deck('d1', 'Compilers'), deck('d2', 'C++'), deck('d3', 'MLIR')]

  it('counts exactly the cards handed to it', () => {
    const due = [card('c1', 'd1'), card('c2', 'd1'), card('c3', 'd2')]
    expect(summarizeDueQueue(due, decks).dueCount).toBe(3)
  })

  it('lists contributing decks in queue order, deduplicated', () => {
    const due = [card('c1', 'd2'), card('c2', 'd1'), card('c3', 'd2'), card('c4', 'd3')]
    expect(summarizeDueQueue(due, decks).deckNames).toEqual(['C++', 'Compilers', 'MLIR'])
  })

  it('truncates to maxNames and reports the remainder', () => {
    const due = [card('c1', 'd1'), card('c2', 'd2'), card('c3', 'd3')]
    const summary = summarizeDueQueue(due, decks, 2)
    expect(summary.deckNames).toEqual(['Compilers', 'C++'])
    expect(summary.extraDeckCount).toBe(1)
  })

  it('never names a deck the user does not own', () => {
    const due = [card('c1', 'ghost-deck'), card('c2', 'd1')]
    const summary = summarizeDueQueue(due, decks)
    expect(summary.deckNames).toEqual(['Compilers'])
    expect(summary.dueCount).toBe(2)
  })

  it('is empty for an empty queue', () => {
    expect(summarizeDueQueue([], decks)).toEqual({
      dueCount: 0,
      deckNames: [],
      extraDeckCount: 0,
    })
  })
})

// The queue itself excludes suspended and future cards - that filtering is the
// repository's getDue, shared with /review. Asserted here against the same
// predicate so a change to either side is visible.
describe('due-queue eligibility (repository semantics)', () => {
  const cards = [
    card('due', 'd1'),
    card('future', 'd1', { scheduling: scheduling({ due: NOW + 2 * DAY }) }),
    card('suspended', 'd1', { suspended: true }),
  ]

  it('is only the non-suspended, already-due cards', () => {
    const due = cards.filter((c) => !c.suspended && c.scheduling.due <= NOW)
    expect(due.map((c) => c.id)).toEqual(['due'])
    expect(summarizeDueQueue(due, [deck('d1', 'Compilers')]).dueCount).toBe(1)
  })
})

// ---- estimateSessionMinutes --------------------------------------------------

describe('estimateSessionMinutes', () => {
  it('is zero when nothing is due', () => {
    expect(estimateSessionMinutes([], 0)).toBe(0)
  })

  it('falls back to the documented per-card default without enough history', () => {
    const thin = Array.from({ length: 5 }, (_, i) => log(`c${i}`, 1, { durationMs: 60_000 }))
    // 30 cards x 20s = 10 minutes, not 30 minutes from the five one-minute logs.
    expect(estimateSessionMinutes(thin, 30)).toBe((30 * DEFAULT_SECONDS_PER_CARD) / 60)
  })

  it('uses the learner’s own median once there is enough history', () => {
    const history = Array.from({ length: 20 }, (_, i) => log(`c${i}`, 1, { durationMs: 30_000 }))
    expect(estimateSessionMinutes(history, 10)).toBe(5) // 10 x 30s
  })

  it('is not dragged upward by one abandoned review', () => {
    const history = [
      ...Array.from({ length: 19 }, (_, i) => log(`c${i}`, 1, { durationMs: 10_000 })),
      log('outlier', 1, { durationMs: 4 * 60_000 }),
    ]
    expect(estimateSessionMinutes(history, 12)).toBe(2) // 12 x 10s, median unmoved
  })

  it('discards implausible durations rather than averaging them in', () => {
    // 12 usable 30s reviews plus junk that would halve or triple a mean.
    const history = [
      ...Array.from({ length: 12 }, (_, i) => log(`c${i}`, 1, { durationMs: 30_000 })),
      ...Array.from({ length: 12 }, (_, i) => log(`z${i}`, 1, { durationMs: 40 })),
      ...Array.from({ length: 12 }, (_, i) => log(`y${i}`, 1, { durationMs: 45 * 60_000 })),
    ]
    expect(estimateSessionMinutes(history, 10)).toBe(5)
  })

  it('never estimates less than a minute for a real session', () => {
    const history = Array.from({ length: 20 }, (_, i) => log(`c${i}`, 1, { durationMs: 1_200 }))
    expect(estimateSessionMinutes(history, 1)).toBe(1)
  })
})

describe('nextDueAt', () => {
  it('is the earliest future due among schedulable cards', () => {
    const cards = [
      card('overdue', 'd1'),
      card('later', 'd1', { scheduling: scheduling({ due: NOW + 5 * HOUR }) }),
      card('sooner', 'd1', { scheduling: scheduling({ due: NOW + 2 * HOUR }) }),
      card('suspended', 'd1', {
        suspended: true,
        scheduling: scheduling({ due: NOW + HOUR }),
      }),
    ]
    expect(nextDueAt(cards, NOW)).toBe(NOW + 2 * HOUR)
  })

  it('is undefined when nothing is scheduled ahead', () => {
    expect(nextDueAt([card('overdue', 'd1')], NOW)).toBeUndefined()
  })
})

// ---- computePaceSeries -------------------------------------------------------

describe('computePaceSeries', () => {
  it('always returns exactly seven buckets ending today', () => {
    const days = computePaceSeries([], NOW)
    expect(days).toHaveLength(7)
    expect(days.filter((d) => d.isToday)).toHaveLength(1)
    expect(days[6].isToday).toBe(true)
  })

  it('fills days without reviews with zero rather than dropping them', () => {
    const days = computePaceSeries([log('c1', 6), log('c2', 0)], NOW)
    expect(days.map((d) => d.count)).toEqual([1, 0, 0, 0, 0, 0, 1])
  })

  it('counts every review in a day', () => {
    const logs = [log('c1', 2), log('c2', 2), log('c3', 2)]
    expect(computePaceSeries(logs, NOW)[4].count).toBe(3)
  })

  it('buckets by local calendar day, not by 24-hour offset from now', () => {
    // 00:05 and 23:55 on the same local day, both far from `now`'s 14:30.
    const justAfterMidnight = new Date(2026, 7, 17, 0, 5).getTime()
    const justBeforeMidnight = new Date(2026, 7, 17, 23, 55).getTime()
    const logs = [
      log('c1', 1, { reviewedAt: justAfterMidnight }),
      log('c2', 1, { reviewedAt: justBeforeMidnight }),
    ]
    const days = computePaceSeries(logs, NOW)
    expect(days[5].count).toBe(2) // yesterday
    expect(days[6].count).toBe(0) // today
  })

  it('ignores history older than the window', () => {
    expect(computePaceSeries([log('c1', 30)], NOW).every((d) => d.count === 0)).toBe(true)
  })
})

// ---- buildContinueLearning ---------------------------------------------------

describe('buildContinueLearning', () => {
  const decks = [
    deck('backlog', 'Backlog'),
    deck('recent', 'Recent'),
    deck('idle', 'Idle'),
  ]

  function metricsFrom(cards: Card[]) {
    const due = cards.filter((c) => !c.suspended && c.scheduling.due <= NOW)
    return computeDeckMetrics(cards, due)
  }

  it('returns only real decks, with their real due counts', () => {
    const cards = [card('a', 'backlog'), card('b', 'backlog'), card('c', 'recent')]
    const rows = buildContinueLearning(decks, metricsFrom(cards))
    expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(['Backlog', 'Recent', 'Idle']))
    expect(rows.find((r) => r.deckId === 'backlog')?.dueCount).toBe(2)
  })

  it('puts decks with due work above decks with none', () => {
    const cards = [
      // Idle was studied most recently, but has nothing waiting.
      card('i', 'idle', {
        scheduling: scheduling({ due: NOW + DAY, lastReview: at(0) }),
      }),
      card('b', 'backlog', { scheduling: scheduling({ lastReview: at(9) }) }),
    ]
    const rows = buildContinueLearning(decks, metricsFrom(cards))
    expect(rows[0].deckId).toBe('backlog')
    expect(rows.findIndex((r) => r.deckId === 'idle')).toBeGreaterThan(0)
  })

  it('prefers the recently studied deck over the larger backlog', () => {
    const cards = [
      ...Array.from({ length: 20 }, (_, i) =>
        card(`b${i}`, 'backlog', { scheduling: scheduling({ lastReview: at(30) }) }),
      ),
      card('r1', 'recent', { scheduling: scheduling({ lastReview: at(1) }) }),
      card('r2', 'recent', { scheduling: scheduling({ lastReview: at(1) }) }),
    ]
    const rows = buildContinueLearning(decks, metricsFrom(cards))
    expect(rows[0].deckId).toBe('recent')
    expect(rows[1].deckId).toBe('backlog')
  })

  it('breaks ties deterministically by name', () => {
    const cards = [card('a', 'backlog'), card('b', 'recent')]
    const rows = buildContinueLearning(decks, metricsFrom(cards))
    expect(rows.slice(0, 2).map((r) => r.name)).toEqual(['Backlog', 'Recent'])
  })

  it('excludes parent decks, which would repeat their children’s cards', () => {
    const nested = [deck('parent', 'Parent'), deck('child', 'Child', { parentId: 'parent' })]
    const cards = [card('a', 'child')]
    const rows = buildContinueLearning(nested, metricsFrom(cards))
    expect(rows.map((r) => r.deckId)).toEqual(['child'])
  })

  it('honors the row limit', () => {
    const cards = decks.map((d, i) => card(`c${i}`, d.id))
    expect(buildContinueLearning(decks, metricsFrom(cards), 2)).toHaveLength(2)
  })
})

// ---- selectNextMilestone -----------------------------------------------------

describe('selectNextMilestone', () => {
  function metricsFrom(cards: Card[]) {
    const due = cards.filter((c) => !c.suspended && c.scheduling.due <= NOW)
    return computeDeckMetrics(cards, due)
  }

  function select(decks: Deck[], cards: Card[], logs: ReviewLog[]) {
    return selectNextMilestone(decks, cards, logs, metricsFrom(cards))
  }

  it('falls back to a due deck when nothing has ever been reviewed', () => {
    const decks = [deck('d1', 'Compilers')]
    const cards = [card('c1', 'd1'), card('c2', 'd1')]
    expect(select(decks, cards, [])).toEqual({
      kind: 'start-deck',
      deckId: 'd1',
      name: 'Compilers',
      dueCount: 2,
    })
  })

  it('tracks the one deck that is part-learned', () => {
    const decks = [deck('d1', 'MLIR Basics')]
    const cards = ['c1', 'c2', 'c3'].map((id) => card(id, 'd1'))
    const milestone = select(decks, cards, [log('c1', 1)])
    expect(milestone).toMatchObject({
      kind: 'finish-deck',
      deckId: 'd1',
      name: 'MLIR Basics',
      learned: 1,
      total: 3,
    })
  })

  it('picks the most recently reviewed in-progress deck', () => {
    const decks = [deck('d1', 'Older'), deck('d2', 'Newer')]
    const cards = [
      card('a1', 'd1'),
      card('a2', 'd1'),
      card('b1', 'd2'),
      card('b2', 'd2'),
    ]
    const logs = [log('a1', 5), log('b1', 1)]
    expect(select(decks, cards, logs)).toMatchObject({ deckId: 'd2', kind: 'finish-deck' })
  })

  it('does not pick the deck of the latest review when that deck is finished', () => {
    const decks = [deck('done', 'Finished'), deck('wip', 'In progress')]
    const cards = [card('f1', 'done'), card('w1', 'wip'), card('w2', 'wip')]
    // The most recent review of all belongs to the already-complete deck.
    const logs = [log('w1', 4), log('f1', 0)]
    expect(select(decks, cards, logs)).toMatchObject({ deckId: 'wip', kind: 'finish-deck' })
  })

  it('counts learned cards, not review logs', () => {
    const decks = [deck('d1', 'Deck')]
    const cards = [card('c1', 'd1'), card('c2', 'd1'), card('c3', 'd1')]
    // Six reviews, all of the same card.
    const logs = [0, 1, 2, 3, 4, 5].map((n) => log('c1', n))
    expect(select(decks, cards, logs)).toMatchObject({ learned: 1, total: 3 })
  })

  it('excludes suspended cards from the total', () => {
    const decks = [deck('d1', 'Deck')]
    const cards = [
      card('c1', 'd1'),
      card('c2', 'd1'),
      card('c3', 'd1', { suspended: true }),
    ]
    expect(select(decks, cards, [log('c1', 1)])).toMatchObject({ learned: 1, total: 2 })
  })

  it('does not treat a fully reviewed deck as in progress', () => {
    const decks = [deck('done', 'Done'), deck('fresh', 'Fresh')]
    const cards = [
      // Every card reviewed and none due again: complete, so not a milestone.
      card('f1', 'done', { scheduling: scheduling({ due: NOW + DAY }) }),
      card('n1', 'fresh'),
    ]
    const milestone = select(decks, cards, [log('f1', 1)])
    expect(milestone).toMatchObject({ kind: 'start-deck', deckId: 'fresh' })
  })

  it('is null when everything is learned and nothing is due', () => {
    const decks = [deck('d1', 'Deck')]
    const cards = [card('c1', 'd1', { scheduling: scheduling({ due: NOW + DAY }) })]
    expect(select(decks, cards, [log('c1', 1)])).toBeNull()
  })

  it('offers a review when everything is learned but cards are due again', () => {
    const decks = [deck('d1', 'Deck')]
    const cards = [card('c1', 'd1'), card('c2', 'd1')]
    const logs = [log('c1', 3), log('c2', 3)]
    expect(select(decks, cards, logs)).toEqual({
      kind: 'review-deck',
      deckId: 'd1',
      name: 'Deck',
      dueCount: 2,
    })
  })

  it('attributes a moved card to the deck it is in now', () => {
    const decks = [deck('from', 'From'), deck('to', 'To')]
    // c1 was reviewed while it lived in "From", but now belongs to "To".
    const cards = [card('c1', 'to'), card('c2', 'to'), card('x1', 'from')]
    const milestone = select(decks, cards, [log('c1', 1)])
    expect(milestone).toMatchObject({ deckId: 'to', kind: 'finish-deck', learned: 1, total: 2 })
  })

  it('ignores reviews of cards that have since been deleted', () => {
    const decks = [deck('d1', 'Deck')]
    const cards = [card('c1', 'd1'), card('c2', 'd1')]
    const milestone = select(decks, cards, [log('gone', 2), log('c1', 1)])
    expect(milestone).toMatchObject({ learned: 1, total: 2 })
  })

  it('carries the deck’s due count so the row can link honestly', () => {
    const decks = [deck('d1', 'Deck')]
    const cards = [
      card('c1', 'd1'),
      card('c2', 'd1', { scheduling: scheduling({ due: NOW + DAY }) }),
    ]
    expect(select(decks, cards, [log('c1', 1)])).toMatchObject({
      kind: 'finish-deck',
      dueCount: 1,
    })
  })
})

// ---- resolveSessionLimit -----------------------------------------------------

describe('resolveSessionLimit', () => {
  it('accepts positive integers', () => {
    expect(resolveSessionLimit('1')).toBe(1)
    expect(resolveSessionLimit('20')).toBe(20)
    expect(resolveSessionLimit(' 30 ')).toBe(30)
  })

  it.each([null, undefined, '', '   ', '0', '-5', 'abc', '1.5', '10abc', 'NaN', 'Infinity', '1e3'])(
    'treats %o as no limit',
    (raw) => {
      expect(resolveSessionLimit(raw)).toBeUndefined()
    },
  )

  it('rejects values beyond safe integer range', () => {
    expect(resolveSessionLimit('99999999999999999999')).toBeUndefined()
  })
})
