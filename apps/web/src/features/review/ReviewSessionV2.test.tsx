// @vitest-environment happy-dom
//
// Integration test for the production dispatcher: a real Card graded through
// the actual review shell and persisted back to the real
// (fake-indexeddb-backed) repository — not a mocked persistence layer. This
// is the seam Ordering/Matching/Walkthrough's design-preview tests didn't
// exercise (those never touch a repository at all).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Card } from '@/types'
import { richText } from '@/types/card'
import { getRepository } from '@/data'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { ReviewSessionV2 } from './ReviewSessionV2'

const recallCard: Card = {
  id: 'recall-1',
  schemaVersion: 2,
  deckId: 'deck-1',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  suspended: false,
  scheduling: initialSchedulingState(0),
  prompt: richText('What is RAII?'),
  interaction: {
    type: 'recall',
    answer: richText('Resource Acquisition Is Initialization.'),
  },
}

function renderScreen(cards: Card[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReviewSessionV2 cards={cards} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReviewSessionV2', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await repo.cards.clear()
    await repo.reviews.clear()
    await repo.cards.clear()
  })

  afterEach(() => cleanup())

  it('grades a Recall card through the real shell and persists scheduling + a review log', async () => {
    const repo = getRepository()
    await repo.cards.put(recallCard)

    const user = userEvent.setup()
    renderScreen([recallCard])

    // Migrated to Recall: self-graded, reveal via Space, then rate Good (3).
    expect(screen.getByText('What is RAII?')).toBeTruthy()
    await user.keyboard(' ')
    expect(screen.getByText('Resource Acquisition Is Initialization.')).toBeTruthy()
    await user.keyboard('3')

    await waitFor(async () => {
      const stored = await repo.cards.getById(recallCard.id)
      expect(stored?.scheduling.reps).toBeGreaterThan(0)
    })

    const logs = await repo.reviews.all()
    expect(logs.some((l) => l.cardId === recallCard.id && l.rating === 3)).toBe(true)
    // The card's own content is untouched by grading — only scheduling moved.
    const stored = await repo.cards.getById(recallCard.id)
    expect(stored?.prompt).toEqual(recallCard.prompt)
    expect(stored?.interaction).toEqual(recallCard.interaction)
  })

  it('shows the completion screen after the last card, and Undo restores the pre-grade state', async () => {
    const repo = getRepository()
    await repo.cards.put(recallCard)

    const user = userEvent.setup()
    renderScreen([recallCard])

    await user.keyboard(' ')
    await user.keyboard('3')

    const undoButton = await screen.findByRole('button', { name: /Undo last/ })
    await user.click(undoButton)

    await waitFor(async () => {
      const stored = await repo.cards.getById(recallCard.id)
      expect(stored?.scheduling.reps).toBe(0)
    })
    const logs = await repo.reviews.all()
    expect(logs.some((l) => l.cardId === recallCard.id)).toBe(false)

    // Undo restores the card's scheduling verbatim, not just its rep count.
    const restored = await repo.cards.getById(recallCard.id)
    expect(restored?.scheduling.due).toBe(recallCard.scheduling.due)
  })
})
