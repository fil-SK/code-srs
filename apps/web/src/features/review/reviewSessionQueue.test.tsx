// @vitest-environment happy-dom
//
// The review queue is a snapshot, not a live query result. Before Milestone 2
// it was live: grading invalidated the `cards` query key, useDueCards
// refetched, the graded card dropped out of the due array, and ReviewPage -
// which keyed the session component on `cards.length` - remounted it. That
// reset the position to the first remaining card, shrank the "X of Y" total,
// discarded the undo stack, and, after the final card, left the due list empty
// so ReviewPage rendered its pre-session "Nothing due" state instead of the
// session's own completion screen.
//
// These run through the real ReviewPage against a seeded repository, so they
// exercise the actual invalidation/refetch path rather than a mock of it.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Card, Deck, SchedulingState } from '@/types'
import { richText } from '@/types/card'
import { getRepository } from '@/data'
import { ReviewPage } from './ReviewPage'

const repo = getRepository()
const HOUR = 3_600_000
const DAY = 86_400_000

const decks: Deck[] = [
  { id: 'deck-1', name: 'Compilers', createdAt: 0, updatedAt: 0 },
  { id: 'deck-1a', name: 'MLIR', parentId: 'deck-1', createdAt: 0, updatedAt: 0 },
  { id: 'deck-2', name: 'Systems', createdAt: 0, updatedAt: 0 },
]

function scheduling(due: number): SchedulingState {
  return {
    due,
    stability: 4,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 4,
    reps: 2,
    lapses: 0,
    learningSteps: 0,
    state: 'review',
  }
}

// Recall cards only: plain markdown, no fenced code, because CodeMirror does
// not run under happy-dom (see ReviewSessionScreen.test.tsx).
function card(id: string, deckId: string, dueOffsetMs: number): Card {
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
    scheduling: scheduling(Date.now() + dueOffsetMs),
  }
}

// Five cards, staggered into the past so the repository's due-ascending sort
// gives a deterministic queue: q1, q2, q3, q4, q5.
function queueOfFive(deckId = 'deck-1'): Card[] {
  return [1, 2, 3, 4, 5].map((n) => card(`q${n}`, deckId, -(6 - n) * HOUR))
}

async function seed(cards: Card[]) {
  await Promise.all([repo.cards.clear(), repo.decks.clear(), repo.reviews.clear()])
  await repo.decks.bulkPut(decks)
  await repo.cards.bulkPut(cards)
}

function renderPage(entry = '/review') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <ReviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const user = userEvent.setup()

// Reveal the answer, then rate it Good - one full grade.
//
// Waits for the rating controls to be gone first: grading is async (persist,
// then advance), so pressing Space too early lands on the outgoing card, which
// is already revealed and therefore swallows it.
async function gradeCurrent() {
  await waitFor(() => expect(screen.queryByRole('button', { name: /Good/ })).toBeNull())
  await user.keyboard(' ')
  await user.click(await screen.findByRole('button', { name: /Good/ }))
}

function positionText(): string {
  return screen.getByText(/^\d+ of \d+$/).textContent ?? ''
}

describe('review session queue snapshot', () => {
  beforeEach(async () => {
    await seed(queueOfFive())
  })

  afterEach(() => cleanup())

  it('keeps the original total as cards are graded out of the live due list', async () => {
    renderPage()
    expect(await screen.findByText('1 of 5')).toBeTruthy()

    await gradeCurrent()

    // The refetch triggered by grading now returns four due cards. The session
    // must still read 2 of 5 - never 2 of 4, and never back to 1 of anything.
    expect(await screen.findByText('2 of 5')).toBeTruthy()
    expect(screen.queryByText('2 of 4')).toBeNull()
    expect(screen.getByText('Question q2')).toBeTruthy()

    await gradeCurrent()
    expect(await screen.findByText('3 of 5')).toBeTruthy()
    expect(positionText()).toBe('3 of 5')
  })

  it('does not reorder the running session when the underlying due order changes', async () => {
    renderPage()
    expect(await screen.findByText('1 of 5')).toBeTruthy()

    // Make q5 the most overdue card, so a rebuilt queue would surface it next.
    const q5 = await repo.cards.getById('q5')
    await repo.cards.put({ ...q5!, scheduling: scheduling(Date.now() - 10 * DAY) })

    // Grading invalidates the due query, so this refetch sees the new order.
    await gradeCurrent()

    expect(await screen.findByText('2 of 5')).toBeTruthy()
    expect(screen.getByText('Question q2')).toBeTruthy()
    expect(screen.queryByText('Question q5')).toBeNull()
  })

  it('reaches the session’s own completion screen, not the pre-session empty state', async () => {
    renderPage()
    expect(await screen.findByText('1 of 5')).toBeTruthy()

    for (let i = 0; i < 5; i++) await gradeCurrent()

    expect(await screen.findByText('Session complete')).toBeTruthy()
    expect(screen.getByText('Reviewed 5 cards.')).toBeTruthy()
    expect(screen.queryByText(/Nothing due/)).toBeNull()
  })

  it('still supports Undo from the completion screen, against the same snapshot', async () => {
    renderPage()
    expect(await screen.findByText('1 of 5')).toBeTruthy()

    for (let i = 0; i < 5; i++) await gradeCurrent()
    expect(await screen.findByText('Session complete')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /Undo last/ }))

    // Back on the fifth card of the original five, with its review removed.
    expect(await screen.findByText('5 of 5')).toBeTruthy()
    expect(screen.getByText('Question q5')).toBeTruthy()
    await waitFor(async () => {
      expect(await repo.reviews.all()).toHaveLength(4)
    })
  })

  // The lifecycle test: proving invalidations are ignored is not the same as
  // proving a later session is rebuilt.
  it('gives a later session at the identical URL a fresh queue', async () => {
    renderPage()
    expect(await screen.findByText('1 of 5')).toBeTruthy()
    cleanup() // leaving /review unmounts ReviewPage, ending the session

    // A completely different set of cards is due now.
    await seed([card('later-1', 'deck-1', -HOUR), card('later-2', 'deck-1', -2 * HOUR)])

    renderPage()
    expect(await screen.findByText('1 of 2')).toBeTruthy()
    expect(screen.getByText('Question later-2')).toBeTruthy()
    expect(screen.queryByText('Question q1')).toBeNull()
  })
})

describe('review session queue snapshot, scoped and limited', () => {
  afterEach(() => cleanup())

  it('snapshots the limited queue and holds its total', async () => {
    await seed(queueOfFive())
    renderPage('/review?limit=3')

    expect(await screen.findByText('1 of 3')).toBeTruthy()
    await gradeCurrent()
    expect(await screen.findByText('2 of 3')).toBeTruthy()

    await gradeCurrent()
    await gradeCurrent()
    expect(await screen.findByText('Reviewed 3 cards.')).toBeTruthy()
  })

  it('honors deck subtree scope together with a limit', async () => {
    await seed([
      card('in-1', 'deck-1', -5 * HOUR),
      card('in-2', 'deck-1a', -4 * HOUR), // child deck, inside the subtree
      card('in-3', 'deck-1', -3 * HOUR),
      card('out-1', 'deck-2', -2 * HOUR),
    ])

    renderPage('/review?deck=deck-1&limit=2')

    expect(await screen.findByText('1 of 2')).toBeTruthy()
    expect(screen.getByText('Question in-1')).toBeTruthy()

    await gradeCurrent()
    expect(await screen.findByText('2 of 2')).toBeTruthy()
    expect(screen.getByText('Question in-2')).toBeTruthy()
  })

  it('gives a later session with the same deck and limit a fresh queue', async () => {
    await seed([
      card('first-1', 'deck-1', -5 * HOUR),
      card('first-2', 'deck-1', -4 * HOUR),
      card('first-3', 'deck-1', -3 * HOUR),
    ])
    renderPage('/review?deck=deck-1&limit=2')
    expect(await screen.findByText('1 of 2')).toBeTruthy()
    cleanup()

    await seed([card('second-1', 'deck-1', -HOUR)])

    renderPage('/review?deck=deck-1&limit=2')
    expect(await screen.findByText('1 of 1')).toBeTruthy()
    expect(screen.getByText('Question second-1')).toBeTruthy()
  })
})
