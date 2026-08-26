import {
  addCalendarDays,
  buildRange,
  computeHeatmap,
  computeKpis,
  computeLearned,
  computeRetention,
  computeStreak,
  estimateSessionMinutes,
  localDayIndex,
  metricsFor,
  type ReviewLog,
} from '@itera/core'

import { createDemoSeed, type DemoSeed } from './demoWorkspace'
import { demoDeckMetrics, demoProgressViewModel, demoTodayViewModel } from './demoSelectors'
import { demoTodayRetention } from './demoReviewHistory'
import { isDemoCardDue } from './demoScheduling'

const NOW = new Date(2026, 7, 24, 14, 0).getTime()
const GREETING = { mainText: 'Ready?', subtext: 'Keep going.' }

describe('the deterministic demo review history', () => {
  const entities = createDemoSeed(NOW)
  const cardIds = new Set(entities.cards.map((card) => card.id))

  it('uses unique stable ids and references only existing cards', () => {
    expect(new Set(entities.reviewLogs.map((log) => log.id)).size).toBe(entities.reviewLogs.length)
    expect(entities.reviewLogs.map((log) => log.id)).toEqual(
      entities.reviewLogs.map((_, index) => `fixture-review-${String(index + 1).padStart(3, '0')}`),
    )
    // A log naming a card the workspace does not have would make Learned,
    // retention and deck performance disagree with the Library.
    expect(entities.reviewLogs.every((log) => cardIds.has(log.cardId))).toBe(true)
  })

  it('materializes relative to local today and spans a modest pattern with gaps', () => {
    const offsets = entities.reviewLogs.map(
      (log) => localDayIndex(NOW) - localDayIndex(log.reviewedAt),
    )
    expect(Math.min(...offsets)).toBe(1)
    expect(Math.max(...offsets)).toBe(28)
    expect(new Set(offsets).size).toBeGreaterThanOrEqual(8)
    // Real gaps, so the activity map and the retention chart have something
    // honest to show rather than an unbroken block.
    expect(new Set(offsets).has(27)).toBe(false)
    expect(new Set(offsets).has(5)).toBe(false)
  })

  it('is ordered chronologically, so the replay order is the order it happened', () => {
    for (let i = 1; i < entities.reviewLogs.length; i++) {
      expect(entities.reviewLogs[i].reviewedAt).toBeGreaterThanOrEqual(
        entities.reviewLogs[i - 1].reviewedAt,
      )
    }
  })

  it('contains valid believable scheduling inputs and usable durations', () => {
    const states = new Set(['new', 'learning', 'review', 'relearning'])
    for (const log of entities.reviewLogs) {
      expect(states.has(log.stateBefore)).toBe(true)
      expect(states.has(log.state)).toBe(true)
      expect(log.rating).toBeGreaterThanOrEqual(1)
      expect(log.rating).toBeLessThanOrEqual(4)
      expect(Number.isFinite(log.durationMs)).toBe(true)
      expect(log.durationMs).toBeGreaterThanOrEqual(1_000)
      expect(log.durationMs).toBeLessThanOrEqual(5 * 60_000)
      // Produced by the shared scheduler, so it is a real next-due instant.
      expect(log.dueAfter).toBeGreaterThan(log.reviewedAt)
      expect(Number.isFinite(log.stabilityAfter)).toBe(true)
      expect(Number.isFinite(log.difficultyAfter)).toBe(true)
    }
  })

  it('re-materializes identically for the same anchor and moves with another local day', () => {
    expect(createDemoSeed(NOW).reviewLogs).toEqual(entities.reviewLogs)
    const tomorrow = new Date(2026, 7, 25, 14, 0).getTime()
    const moved = createDemoSeed(tomorrow)
    expect(localDayIndex(moved.reviewLogs[0].reviewedAt)).toBe(
      localDayIndex(entities.reviewLogs[0].reviewedAt) + 1,
    )
  })
})

// The invariant M-DEMO-3 originally shipped without. The demo used to hold two
// independent records of the same events - an authored SchedulingState on the
// card and a seeded ReviewLog beside it - and they disagreed for six of the
// twelve reviewed cards. These assertions fail if that is ever reintroduced.
describe('every demo card agrees with its own review history', () => {
  const entities = createDemoSeed(NOW)
  const logsFor = (cardId: string) => entities.reviewLogs.filter((log) => log.cardId === cardId)

  it('gives a reviewed card exactly the state its latest log produced', () => {
    let reviewed = 0
    for (const card of entities.cards) {
      const logs = logsFor(card.id)
      if (logs.length === 0) continue
      reviewed++
      const last = logs[logs.length - 1]

      expect(card.scheduling.state).toBe(last.state)
      expect(card.scheduling.lastReview).toBe(last.reviewedAt)
      expect(card.scheduling.due).toBe(last.dueAfter)
      expect(card.scheduling.stability).toBe(last.stabilityAfter)
      expect(card.scheduling.difficulty).toBe(last.difficultyAfter)
      expect(card.scheduling.reps).toBe(logs.length)
    }
    expect(reviewed).toBeGreaterThan(0)
  })

  it('leaves a card with no history genuinely new', () => {
    let untouched = 0
    for (const card of entities.cards) {
      if (logsFor(card.id).length > 0) continue
      untouched++
      expect(card.scheduling.state).toBe('new')
      expect(card.scheduling.lastReview).toBeUndefined()
      expect(card.scheduling.reps).toBe(0)
      expect(card.scheduling.lapses).toBe(0)
    }
    expect(untouched).toBeGreaterThan(0)
  })

  it('chains the logs of a card so each review begins where the last one ended', () => {
    for (const card of entities.cards) {
      const logs = logsFor(card.id)
      // The first review of a card must start from its authored new state.
      if (logs.length > 0) expect(logs[0].stateBefore).toBe('new')
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].stateBefore).toBe(logs[i - 1].state)
        expect(logs[i].stabilityBefore).toBe(logs[i - 1].stabilityAfter)
        expect(logs[i].difficultyBefore).toBe(logs[i - 1].difficultyAfter)
        expect(logs[i].reviewedAt).toBeGreaterThan(logs[i - 1].reviewedAt)
      }
    }
  })

  it('counts lapses as the scheduler counted them, not as authored', () => {
    for (const card of entities.cards) {
      const logs = logsFor(card.id)
      if (logs.length === 0) continue
      const failedMature = logs.filter(
        (log) =>
          log.rating === 1 && (log.stateBefore === 'review' || log.stateBefore === 'relearning'),
      ).length
      expect(card.scheduling.lapses).toBe(failedMature)
    }
  })
})

// VERIFY-M3-03. Today used to average all of history while Progress averaged
// thirty days, so the two agreed only for as long as the fixture happened to
// fit inside the window. These logs are built so the two answers must differ.
describe('Today retention is the trailing 30 calendar days', () => {
  const at = (daysAgo: number, hour: number) => {
    const date = new Date(addCalendarDays(NOW, -daysAgo))
    date.setHours(hour, 0, 0, 0)
    return date.getTime()
  }

  const mature = (id: string, daysAgo: number, rating: 1 | 2 | 3 | 4): ReviewLog => ({
    id,
    cardId: 'fixture-card-loop-invariant',
    reviewedAt: at(daysAgo, 9),
    rating,
    autoGraded: false,
    durationMs: 20_000,
    stabilityBefore: 8,
    stabilityAfter: rating === 1 ? 4 : 12,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore: 'review',
    state: rating === 1 ? 'relearning' : 'review',
    dueAfter: at(daysAgo - 1, 9),
  })

  // Two mature failures well outside the window, two successes inside it.
  const logs = [
    mature('old-fail-1', 45, 1),
    mature('old-fail-2', 40, 1),
    mature('recent-1', 12, 3),
    mature('recent-2', 4, 3),
  ]

  it('ignores a mature failure older than the window that all-time would count', () => {
    expect(demoTodayRetention(logs, NOW)).toBe(1)
    expect(computeRetention(logs)).toBe(0.5)
    // The point of the fixture: the two answers genuinely differ, so a
    // regression back to all-time cannot pass by coincidence.
    expect(demoTodayRetention(logs, NOW)).not.toBe(computeRetention(logs))
  })

  it('includes the oldest day the window covers and excludes the day before it', () => {
    // buildRange('30d') spans 30 local dates ending today, so day -29 is in.
    expect(demoTodayRetention([mature('edge', 29, 1), mature('inside', 1, 3)], NOW)).toBe(0.5)
    expect(demoTodayRetention([mature('edge', 30, 1), mature('inside', 1, 3)], NOW)).toBe(1)
  })

  it('shows that window on Today, and the same one on Progress', () => {
    const seeded: DemoSeed = { ...createDemoSeed(NOW), reviewLogs: logs }
    const today = demoTodayViewModel(seeded, GREETING, NOW)
    const progress = demoProgressViewModel(seeded, NOW)

    expect(today.retention).toBe(100)
    expect(Math.round(computeRetention(logs)! * 100)).toBe(50)
    expect(progress.retentionPercent).toBe(today.retention)
  })

  it('keeps the retention definition itself unchanged', () => {
    const immature: ReviewLog = { ...mature('learning', 2, 1), stateBefore: 'learning' }
    // An immature attempt is excluded whichever window is applied.
    expect(demoTodayRetention([immature, mature('m', 2, 2)], NOW)).toBe(1)
    // Hard counts as a success; Again does not.
    expect(demoTodayRetention([mature('hard', 2, 2)], NOW)).toBe(1)
    expect(demoTodayRetention([mature('again', 2, 1)], NOW)).toBe(0)
    expect(demoTodayRetention([], NOW)).toBeNull()
  })
})

describe('shared statistics power every demo surface', () => {
  const entities = createDemoSeed(NOW)
  const dueCards = entities.cards.filter((card) => isDemoCardDue(card, NOW))
  const today = demoTodayViewModel(entities, GREETING, NOW)
  const progress = demoProgressViewModel(entities, NOW)
  const kpis = computeKpis(
    entities.cards,
    dueCards,
    entities.reviewLogs,
    buildRange('30d', NOW),
    NOW,
  )

  it('derives Today from canonical due, streak, retention, and duration helpers', () => {
    expect(today.dueToday).toBe(dueCards.length)
    expect(today.streak).toBe(computeStreak(entities.reviewLogs, NOW).current)
    expect(today.retention).toBe(Math.round(demoTodayRetention(entities.reviewLogs, NOW)! * 100))
    expect(today.estimatedMinutes).toBe(
      estimateSessionMinutes(entities.reviewLogs, dueCards.length),
    )
  })

  it('derives Continue Learning from the same cards and shared deck metrics', () => {
    const metrics = demoDeckMetrics(entities, NOW)
    for (const row of today.decks) {
      expect(row.dueCount).toBe(metricsFor(metrics, row.id).dueCount)
      expect(row.progressPercent).toBe(Math.round(metricsFor(metrics, row.id).masteryFraction * 100))
    }
  })

  it('uses canonical Learned, Due, Reviews, Retention, and streak KPIs', () => {
    const metric = (id: string) => progress.metrics.find((entry) => entry.id === id)?.value
    expect(metric('learned')).toBe(
      String(computeLearned(entities.cards, entities.reviewLogs).learned),
    )
    expect(metric('due')).toBe(String(kpis.due))
    expect(metric('reviews')).toBe(String(kpis.reviews.value))
    expect(metric('retention')).toBe(`${Math.round(kpis.retention.value! * 100)}%`)
    expect(metric('streak')).toBe(`${kpis.streak} days`)
  })

  it('keeps Today and Progress due, streak, and retention consistent', () => {
    const metric = (id: string) => progress.metrics.find((entry) => entry.id === id)?.value
    expect(metric('due')).toBe(String(today.dueToday))
    expect(metric('streak')).toBe(`${today.streak} days`)
    expect(progress.retentionPercent).toBe(today.retention)
  })

  it('makes the selected range affect reviews, retention buckets, and heatmap cells', () => {
    const seven = demoProgressViewModel(entities, NOW, '7d')
    expect(Number(progress.metrics.find((entry) => entry.id === 'reviews')?.value)).toBeGreaterThan(
      Number(seven.metrics.find((entry) => entry.id === 'reviews')?.value),
    )
    expect(seven.activityDays).toHaveLength(7)
    expect(progress.activityDays).toHaveLength(30)
    expect(seven.retentionSeries).toHaveLength(7)
    expect(computeHeatmap(entities.reviewLogs, 7, NOW).map((day) => day.count)).toEqual(
      seven.activityDays.map((day) => day.count),
    )
  })

  it('preserves chart gaps and isolated observations', () => {
    const series = progress.retentionSeries
    expect(series.some((value) => value === null)).toBe(true)
    expect(
      series.some(
        (value, index) => value !== null && series[index - 1] === null && series[index + 1] === null,
      ),
    ).toBe(true)
    expect(series.some((value, index) => value !== null && series[index + 1] !== null)).toBe(true)
  })

  it('derives deck performance and milestones from actual review logs', () => {
    expect(progress.decks.length).toBeGreaterThan(0)
    expect(progress.milestones.some((milestone) => milestone.type === 'streak')).toBe(true)
    expect(progress.milestones.some((milestone) => milestone.type === 'retention')).toBe(true)
  })
})
