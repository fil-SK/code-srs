// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { addCalendarDays, getRepository, type ReviewLog } from '@fliptap/core'
import { AchievementsPage } from './AchievementsPage'

const now = Date.now()
function scheduledLog(id: string, daysBack: number, extra: Partial<ReviewLog> = {}): ReviewLog {
  const at = addCalendarDays(now, -daysBack)
  return {
    id, cardId: 'card', reviewedAt: at, dueBefore: at,
    rating: 3, autoGraded: false, durationMs: 1000,
    stabilityBefore: 2, stabilityAfter: 3, difficultyBefore: 5, difficultyAfter: 5,
    stateBefore: 'review', state: 'review', ...extra,
  }
}
function renderAchievements() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/progress/achievements']}><AchievementsPage /></MemoryRouter></QueryClientProvider>)
}
async function collection() {
  return within(await screen.findByRole('region', { name: 'All achievements' }))
}
beforeEach(async () => { await getRepository().reviews.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Achievements view', () => {
  it('offers the four real milestones and a truthful starting state without history', async () => {
    renderAchievements()
    const cards = await collection()
    expect(cards.getAllByRole('listitem')).toHaveLength(4)
    expect(cards.getAllByText('Locked')).toHaveLength(4)
    const summary = screen.getByRole('progressbar', { name: 'Milestones earned' })
    expect(summary.getAttribute('aria-valuenow')).toBe('0')
    expect(summary.getAttribute('aria-valuemax')).toBe('4')
    expect(screen.getByRole('progressbar', { name: 'Next milestone: First step' }).getAttribute('aria-valuenow')).toBe('0')
    expect(screen.getByRole('link', { name: 'Achievements' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Overview' }).hasAttribute('aria-current')).toBe(false)
  })

  it('retains an old earned session and uses the same pending catalog order as Today', async () => {
    await getRepository().reviews.bulkPut([
      scheduledLog('old-session', 40, { sessionCompleted: true }),
      scheduledLog('today', 0),
    ])
    renderAchievements()
    const cards = await collection()
    expect(cards.getAllByText('Earned', { selector: 'span' })).toHaveLength(1)
    expect(cards.getAllByText('In progress')).toHaveLength(2)
    const first = cards.getByRole('heading', { name: 'First step' }).closest('li')
    expect(first?.querySelector('time')?.getAttribute('datetime')).toBe(new Date(addCalendarDays(now, -40)).toISOString())
    expect(screen.getByRole('progressbar', { name: 'Milestones earned' }).getAttribute('aria-valuenow')).toBe('1')
    expect(screen.getByRole('progressbar', { name: 'Next milestone: Finding your rhythm' }).getAttribute('aria-valuetext')).toBe('1 of 5 days in the last 7 days')
    expect(cards.getByRole('progressbar', { name: 'Here to stay' }).getAttribute('aria-valuenow')).toBe('2')
    expect(screen.queryByRole('button', { name: 'Select progress date range' })).toBeNull()
  })

  it('filters earned and pending milestones without changing lifetime summary or the next target', async () => {
    const user = userEvent.setup()
    await getRepository().reviews.append(scheduledLog('session', 0, { sessionCompleted: true }))
    renderAchievements()
    const cards = await collection()
    await user.click(cards.getByRole('button', { name: 'All achievements' }))
    await user.click(screen.getByRole('option', { name: 'Earned' }))
    expect(cards.getAllByRole('listitem')).toHaveLength(1)
    expect(cards.getByRole('heading', { name: 'First step' })).toBeTruthy()
    await user.click(cards.getByRole('button', { name: 'Earned', exact: true }))
    await user.click(screen.getByRole('option', { name: 'Not yet earned' }))
    expect(cards.getAllByRole('listitem')).toHaveLength(3)
    expect(cards.queryByRole('heading', { name: 'First step' })).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'Milestones earned' }).getAttribute('aria-valuenow')).toBe('1')
    expect(screen.getByRole('progressbar', { name: 'Next milestone: Finding your rhythm' })).toBeTruthy()
  })

  it('explains an empty earned filter', async () => {
    const user = userEvent.setup()
    renderAchievements()
    const cards = await collection()
    await user.click(cards.getByRole('button', { name: 'All achievements' }))
    await user.click(screen.getByRole('option', { name: 'Earned' }))
    expect(cards.queryAllByRole('listitem')).toHaveLength(0)
    expect(cards.getByRole('status').textContent).toContain('No milestones earned yet')
  })

  it('shows the complete collection without inventing another milestone after all four are earned', async () => {
    await getRepository().reviews.bulkPut([
      scheduledLog('first', 28, { sessionCompleted: true }),
      ...[21, 14, 7, 6, 5, 4, 3, 2].map((day) => scheduledLog(`day-${day}`, day)),
      scheduledLog('missed', 1, { rating: 1 }), scheduledLog('recalled', 0),
    ])
    renderAchievements()
    const cards = await collection()
    expect(cards.getAllByText('Earned', { selector: 'span' })).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'Every milestone earned' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Up next' })).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'Milestones earned' }).getAttribute('aria-valuenow')).toBe('4')
    const user = userEvent.setup()
    await user.click(cards.getByRole('button', { name: 'All achievements' }))
    await user.click(screen.getByRole('option', { name: 'Not yet earned' }))
    expect(cards.getByRole('status').textContent).toContain('Your collection is complete')
  })

  it('offers retry instead of claiming zero awards when history fails to load', async () => {
    const read = vi.spyOn(getRepository().reviews, 'all').mockRejectedValueOnce(new Error('offline'))
    renderAchievements()
    expect((await screen.findByRole('alert')).textContent).toContain("couldn't be loaded")
    expect(screen.queryByRole('progressbar', { name: 'Milestones earned' })).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await collection()
    expect(read).toHaveBeenCalledTimes(2)
  })
})