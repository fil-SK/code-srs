// @vitest-environment happy-dom
//
// The nav badge hard-coded 7 until Milestone 2. It now reads the same
// domain/stats/streak calculation Today's Momentum panel and Progress's KPI
// tile use - these assert it reflects real history, including the honest zero.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReviewLog } from '@/types'
import { getRepository } from '@/data'
import { calendarDaysBetween } from '@/domain/stats/calendarDay'
import { computeStreak } from '@/domain/stats/streak'
import { StreakBadge } from './StreakBadge'

const repo = getRepository()

// The badge reads the live clock through the hook, so these fixtures are placed
// relative to the real current date - but by calendar day, mid-morning, never by
// subtracting fixed milliseconds.
function log(daysAgo: number): ReviewLog {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(10, 0, 0, 0)
  return {
    id: `log-${daysAgo}`,
    cardId: 'card-1',
    reviewedAt: d.getTime(),
    rating: 3,
    autoGraded: false,
    durationMs: 5_000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore: 'review',
    state: 'review',
  }
}

async function seed(logs: ReviewLog[]) {
  await repo.reviews.clear()
  await repo.reviews.bulkPut(logs)
}

function renderBadge() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StreakBadge />
    </QueryClientProvider>,
  )
}

describe('StreakBadge', () => {
  beforeEach(() => seed([]))
  afterEach(() => cleanup())

  it('shows an honest zero rather than disappearing', async () => {
    renderBadge()
    expect(await screen.findAllByText('0')).toHaveLength(2) // wide + narrow slot
  })

  it('shows the real current streak', async () => {
    await seed([log(0), log(1), log(2), log(3)])
    renderBadge()
    expect((await screen.findAllByText('4')).length).toBeGreaterThan(0)
  })

  it('agrees with the canonical calculation, grace behavior included', async () => {
    // Studied through yesterday, nothing yet today: still a live streak.
    const logs = [log(1), log(2), log(3)]
    await seed(logs)
    renderBadge()

    const expected = computeStreak(logs, Date.now()).current
    expect(expected).toBe(3)
    expect((await screen.findAllByText(String(expected))).length).toBeGreaterThan(0)
  })

  it('drops to zero once a full day has been missed', async () => {
    await seed([log(2), log(3)])
    renderBadge()
    expect(await screen.findAllByText('0')).toHaveLength(2)
  })

  it('is unaffected by history older than the current run', async () => {
    const logs = [log(0), log(1), ...Array.from({ length: 5 }, (_, i) => log(20 + i))]
    await seed(logs.map((l, i) => ({ ...l, id: `l${i}` })))
    renderBadge()
    expect((await screen.findAllByText('2')).length).toBeGreaterThan(0)
    // Best streak is longer, but the nav deliberately shows only the current
    // one - the shared calculation still reports both.
    expect(computeStreak(logs, Date.now()).best).toBe(5)
  })

  it('counts days, not reviews', async () => {
    const sameDay = [0, 0, 0, 0].map((d, i) => ({ ...log(d), id: `same-${i}` }))
    await seed(sameDay)
    renderBadge()
    expect((await screen.findAllByText('1')).length).toBeGreaterThan(0)
  })
})

// A guard that the fixture helper really produces consecutive local dates.
// Deliberately calendar adjacency, not a 24-hour difference: the two DST
// transition days are 23 and 25 hours long, so the millisecond form of this
// assertion was itself false twice a year.
describe('fixture sanity', () => {
  it('places consecutive fixtures on adjacent local calendar dates', () => {
    expect(calendarDaysBetween(log(2).reviewedAt, log(1).reviewedAt)).toBe(1)
  })
})
