// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Card, Deck, ReviewLog, SchedulingStateKind } from '@/types'
import { richText } from '@/types/card'
import { getRepository } from '@/data'
import { ProgressPage } from './ProgressPage'

const repo = getRepository()
const DAY = 86_400_000

const decks: Deck[] = [
  { id: 'due-deck', name: 'Due deck', createdAt: 0, updatedAt: 0 },
  { id: 'studied-deck', name: 'Studied deck', createdAt: 0, updatedAt: 0 },
]

function card(id: string, deckId: string, due: number, suspended = false): Card {
  return {
    id,
    schemaVersion: 2,
    deckId,
    prompt: richText(id),
    interaction: { type: 'recall', answer: richText('answer') },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended,
    scheduling: {
      due,
      stability: 3,
      difficulty: 5,
      elapsedDays: 1,
      scheduledDays: 3,
      reps: 1,
      lapses: 0,
      learningSteps: 0,
      state: 'review',
    },
  }
}

function log(
  id: string,
  cardId: string,
  reviewedAt: number,
  rating: ReviewLog['rating'],
  stateBefore: SchedulingStateKind,
): ReviewLog {
  return {
    id,
    cardId,
    reviewedAt,
    rating,
    autoGraded: false,
    durationMs: 1_000,
    stabilityBefore: 2,
    stabilityAfter: 3,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore,
    state: rating === 1 ? 'relearning' : 'review',
  }
}

async function seed() {
  const now = Date.now()
  const cards = [
    card('due-card', 'due-deck', now - DAY),
    card('mature-card', 'studied-deck', now + DAY),
    card('new-card', 'studied-deck', now + DAY),
    card('suspended-due', 'due-deck', now - DAY, true),
  ]
  const logs = [
    log('current-good', 'mature-card', now - DAY, 3, 'review'),
    log('current-again', 'mature-card', now - 2 * DAY, 1, 'review'),
    log('current-new-easy', 'new-card', now - 10 * DAY, 4, 'new'),
    log('previous-again', 'mature-card', now - 40 * DAY, 1, 'review'),
  ]
  await Promise.all([repo.cards.clear(), repo.decks.clear(), repo.reviews.clear()])
  await repo.decks.bulkPut(decks)
  await repo.cards.bulkPut(cards)
  await repo.reviews.bulkPut(logs)
}

function renderProgress() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/progress']}>
        <ProgressPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => seed())
afterEach(() => cleanup())

describe('Progress headline contract', () => {
  it('renders exactly the five current KPI labels and no removed headline labels', async () => {
    renderProgress()
    await screen.findByRole('group', { name: 'Learned' })

    for (const label of ['Learned', 'Due', 'Reviews', 'Retention', 'Current streak']) {
      expect(screen.getByRole('group', { name: label })).toBeTruthy()
    }
    expect(screen.queryByRole('group', { name: 'Total sessions' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Avg. accuracy' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Cards reviewed' })).toBeNull()
  })

  it('shows current-state captions without fake deltas and period deltas only where valid', async () => {
    renderProgress()
    const learned = await screen.findByRole('group', { name: 'Learned' })
    const due = screen.getByRole('group', { name: 'Due' })
    const reviews = screen.getByRole('group', { name: 'Reviews' })
    const retention = screen.getByRole('group', { name: 'Retention' })
    const streak = screen.getByRole('group', { name: 'Current streak' })

    expect(within(learned).getByText('2 of 3 active cards')).toBeTruthy()
    expect(within(due).getByText('Due now')).toBeTruthy()
    expect(within(due).getByText('1')).toBeTruthy()
    expect(within(learned).queryByText(/ vs /)).toBeNull()
    expect(within(due).queryByText(/ vs /)).toBeNull()
    expect(within(streak).queryByText(/ vs /)).toBeNull()
    expect(within(reviews).getByText(/200% vs/)).toBeTruthy()
    expect(within(retention).getByText(/50 pp vs/)).toBeTruthy()
  })

  it('updates the Reviews KPI when the selected date range changes', async () => {
    const user = userEvent.setup()
    renderProgress()
    const reviews = await screen.findByRole('group', { name: 'Reviews' })
    expect(within(reviews).getByText('3')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Select progress date range' }))
    await user.click(screen.getByRole('option', { name: 'Last 7 days' }))
    expect(within(reviews).getByText('2')).toBeTruthy()
  })
})

describe('Progress deck actionability', () => {
  it('keeps a zero-review due deck visible, first, and linked to its review scope', async () => {
    renderProgress()
    const dueDeck = await screen.findByText('Due deck')
    const studiedDeck = screen.getByText('Studied deck')
    const dueLink = dueDeck.closest('a')
    expect(dueLink?.getAttribute('href')).toBe('/review?deck=due-deck')
    expect(dueLink?.textContent).toContain('0 / 1')
    expect(dueLink?.textContent).toContain('1')
    expect(dueDeck.compareDocumentPosition(studiedDeck) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
