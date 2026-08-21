// @vitest-environment happy-dom
//
// Today's four product states, driven through the real page against a seeded
// repository. Before Milestone 2 every value here was a literal in a
// component; these assert that none of the old fixtures can come back and that
// each state is honest about what it does and does not know.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Card, Deck, ReviewLog, SchedulingState } from '@/types'
import { richText } from '@/types/card'
import { getRepository } from '@/data'
import { TodayPage } from './TodayPage'

const repo = getRepository()
const HOUR = 3_600_000
const DAY = 86_400_000

const decks: Deck[] = [
  { id: 'deck-1', name: 'Compilers', description: 'Passes and IR', createdAt: 0, updatedAt: 0 },
  { id: 'deck-2', name: 'Systems', createdAt: 0, updatedAt: 0 },
]

function scheduling(due: number, lastReview?: number): SchedulingState {
  return {
    due,
    stability: 4,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 4,
    reps: lastReview ? 2 : 0,
    lapses: 0,
    learningSteps: 0,
    state: lastReview ? 'review' : 'new',
    lastReview,
  }
}

function card(id: string, deckId: string, due: number, lastReview?: number): Card {
  return {
    id,
    schemaVersion: 2,
    deckId,
    prompt: richText(`Question ${id}`),
    interaction: { type: 'recall', answer: richText(`Answer ${id}`) },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling: scheduling(due, lastReview),
  }
}

function log(cardId: string, reviewedAt: number): ReviewLog {
  return {
    id: `log-${cardId}-${reviewedAt}`,
    cardId,
    reviewedAt,
    rating: 3,
    autoGraded: false,
    durationMs: 12_000,
    stabilityBefore: 1,
    stabilityAfter: 4,
    difficultyBefore: 5,
    difficultyAfter: 5,
    state: 'review',
  }
}

async function seed({
  decks: seedDecks = [],
  cards = [],
  logs = [],
}: {
  decks?: Deck[]
  cards?: Card[]
  logs?: ReviewLog[]
}) {
  await Promise.all([repo.cards.clear(), repo.decks.clear(), repo.reviews.clear()])
  await repo.decks.bulkPut(seedDecks)
  await repo.cards.bulkPut(cards)
  await repo.reviews.bulkPut(logs)
}

function renderToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// The literals Today shipped with. None of them may ever render again.
const OLD_FIXTURES = [
  '24 cards',
  'Type deduction',
  'Storage duration',
  '4 of 5 sessions',
  'Weekly goal',
  'Recall rate',
  'Finish Type Deduction',
  '12 / 18 topics mastered',
  'C++ Fundamentals',
  'Compiler Architecture',
  'System Design',
  'You’re on track',
  'View all topics',
]

afterEach(() => cleanup())

describe('Today — brand-new workspace', () => {
  beforeEach(() => seed({}))

  it('shows one intentional empty state instead of panels full of zeros', async () => {
    renderToday()

    expect(await screen.findByText('No decks yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Create a deck' }).getAttribute('href')).toBe('/decks')
    expect(screen.getByRole('link', { name: 'Import' }).getAttribute('href')).toBe(
      '/settings/import-export',
    )

    // No fabricated momentum, no session, no chart.
    expect(screen.queryByRole('heading', { name: 'Momentum' })).toBeNull()
    expect(screen.queryByText(/Start session/)).toBeNull()
    // Card creation requires a deck, so no global new-card route is offered.
    expect(screen.queryByRole('link', { name: /New card/ })).toBeNull()
  })
})

describe('Today — cards exist but nothing is due', () => {
  beforeEach(async () => {
    const now = Date.now()
    await seed({
      decks,
      cards: [
        card('c1', 'deck-1', now + 5 * HOUR, now - DAY),
        card('c2', 'deck-1', now + 3 * DAY, now - DAY),
      ],
      logs: [log('c1', Date.now() - DAY)],
    })
  })

  it('says nothing is due instead of claiming a session', async () => {
    renderToday()

    expect(await screen.findByText('Nothing due')).toBeTruthy()
    // The hero's eyebrow, and again on the milestone row - both honest.
    expect(screen.getAllByText('All caught up').length).toBeGreaterThan(0)
    expect(screen.getByText(/Next card due/)).toBeTruthy()
    expect(screen.queryByText('Start session')).toBeNull()
  })

  it('does not offer Adjust session, which cannot create due work', async () => {
    renderToday()
    await screen.findByText('Nothing due')
    expect(screen.queryByRole('button', { name: /Adjust session/ })).toBeNull()
  })

  it('still shows real context in Momentum', async () => {
    renderToday()
    await screen.findByText('Nothing due')
    expect(screen.getByText('Current streak')).toBeTruthy()
    expect(screen.getByText('Due today')).toBeTruthy()
  })
})

describe('Today — due cards but no review history', () => {
  beforeEach(async () => {
    const now = Date.now()
    await seed({
      decks,
      cards: [card('c1', 'deck-1', now - HOUR), card('c2', 'deck-2', now - 2 * HOUR)],
      logs: [],
    })
  })

  it('shows a real due count and the real contributing decks', async () => {
    renderToday()
    expect(await screen.findByText('2 cards')).toBeTruthy()
    expect(screen.getByText('Systems · Compilers')).toBeTruthy()
  })

  it('reports a zero streak and an absent retention rather than 0%', async () => {
    renderToday()
    await screen.findByText('2 cards')

    const momentum = within(screen.getByRole('region', { name: 'Momentum' }))
    expect(momentum.getByText('0')).toBeTruthy()
    expect(momentum.getByText('Review a card to start one')).toBeTruthy()
    expect(momentum.getByText('No mature reviews yet')).toBeTruthy()
    expect(momentum.getByText('—')).toBeTruthy()
    expect(momentum.queryByText('0%')).toBeNull()
  })

  it('uses the documented fallback estimate', async () => {
    renderToday()
    // 2 cards x the 20s default = 1 minute (rounded up from 0.67).
    expect(await screen.findByText('Approximately 1 minute')).toBeTruthy()
  })

  it('falls back to a due deck for the milestone, since nothing is in progress', async () => {
    renderToday()
    await screen.findByText('2 cards')
    const momentum = within(screen.getByRole('region', { name: 'Momentum' }))
    expect(momentum.getByText(/^Start /)).toBeTruthy()
  })

  it('shows an honest empty pace chart', async () => {
    renderToday()
    await screen.findByText('2 cards')
    expect(screen.getByText('No reviews in the last 7 days')).toBeTruthy()
  })
})

describe('Today — populated', () => {
  beforeEach(async () => {
    const now = Date.now()
    await seed({
      decks,
      cards: [
        card('c1', 'deck-1', now - HOUR, now - DAY),
        card('c2', 'deck-1', now - 2 * HOUR, now - DAY),
        card('c3', 'deck-1', now + 3 * DAY), // in the deck, never reviewed
        card('c4', 'deck-2', now + 3 * DAY, now - 5 * DAY),
      ],
      logs: [log('c1', now - DAY), log('c2', now - DAY), log('c4', now - 5 * DAY)],
    })
  })

  it('renders four real Momentum rows', async () => {
    renderToday()
    await screen.findByRole('heading', { name: 'Momentum' })

    expect(screen.getByText('Current streak')).toBeTruthy()
    expect(screen.getByText('Retention')).toBeTruthy()
    expect(screen.getByText('Due today')).toBeTruthy()
    expect(screen.getByText('Next milestone')).toBeTruthy()
  })

  it('tracks the in-progress deck with learned-card wording', async () => {
    renderToday()
    expect(await screen.findByText('Finish Compilers')).toBeTruthy()
    expect(screen.getByText('2 of 3 cards learned')).toBeTruthy()
    expect(screen.queryByText(/mastered/)).toBeNull()
  })

  it('lists real decks in Continue learning, linking at the right scope', async () => {
    renderToday()
    await screen.findByText('2 cards')
    const list = within(screen.getByRole('region', { name: 'Continue learning' }))

    expect(list.getByText('Compilers')).toBeTruthy()
    expect(list.getByText('Passes and IR')).toBeTruthy()
    expect(list.getByText('Systems')).toBeTruthy()
    // Compilers has due cards; Systems does not, so it opens the deck rather
    // than starting a session that would immediately be empty.
    expect(list.getByRole('link', { name: /Continue/ }).getAttribute('href')).toBe(
      '/review?deck=deck-1',
    )
    expect(list.getByRole('link', { name: /Open/ }).getAttribute('href')).toBe('/decks/deck-2')
  })

  it('carries no leftover fixture content anywhere on the page', async () => {
    renderToday()
    await screen.findByRole('heading', { name: 'Momentum' })
    for (const fixture of OLD_FIXTURES) {
      expect(screen.queryByText(fixture)).toBeNull()
    }
  })
})
