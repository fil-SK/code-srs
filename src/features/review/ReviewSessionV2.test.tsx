// @vitest-environment happy-dom
//
// Integration test for the production dispatcher: a real v1 Card, migrated
// on read, graded through the actual v2 shell, persisted back to the real
// (fake-indexeddb-backed) repository — not a mocked persistence layer. This
// is the seam Ordering/Matching/Walkthrough's design-preview tests didn't
// exercise (those never touch a repository at all).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { ReviewSessionV2 } from './ReviewSessionV2'

const basicCard: Card = {
  id: 'v1-basic-1',
  deckId: 'deck-1',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  suspended: false,
  scheduling: initialSchedulingState(0),
  type: 'basic',
  content: { front: 'What is RAII?', back: 'Resource Acquisition Is Initialization.' },
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
    await repo.cardStates.clear()
  })

  afterEach(() => cleanup())

  it('migrates a v1 "basic" card to Recall, grades it through the real shell, and persists scheduling + a review log', async () => {
    const repo = getRepository()
    await repo.cards.put(basicCard)

    const user = userEvent.setup()
    renderScreen([basicCard])

    // Migrated to Recall: self-graded, reveal via Space, then rate Good (3).
    expect(screen.getByText('What is RAII?')).toBeTruthy()
    await user.keyboard(' ')
    expect(screen.getByText('Resource Acquisition Is Initialization.')).toBeTruthy()
    await user.keyboard('3')

    await waitFor(async () => {
      const stored = await repo.cards.getById(basicCard.id)
      expect(stored?.scheduling.reps).toBeGreaterThan(0)
    })

    const logs = await repo.reviews.all()
    expect(logs.some((l) => l.cardId === basicCard.id && l.rating === 3)).toBe(true)
    // The card's own content is untouched by the v2 round-trip — only scheduling moved.
    const stored = await repo.cards.getById(basicCard.id)
    expect(stored?.content).toEqual(basicCard.content)

    // Phase D dual-write: the CardState row must mirror Card.scheduling exactly.
    const cardState = await repo.cardStates.getById(basicCard.id)
    expect(cardState?.reps).toBe(stored?.scheduling.reps)
    expect(cardState?.due).toBe(stored?.scheduling.due)
    expect(cardState?.suspended).toBe(false)
  })

  it('shows the completion screen after the last card, and Undo restores the pre-grade state', async () => {
    const repo = getRepository()
    await repo.cards.put(basicCard)

    const user = userEvent.setup()
    renderScreen([basicCard])

    await user.keyboard(' ')
    await user.keyboard('3')

    const undoButton = await screen.findByRole('button', { name: /Undo last/ })
    await user.click(undoButton)

    await waitFor(async () => {
      const stored = await repo.cards.getById(basicCard.id)
      expect(stored?.scheduling.reps).toBe(0)
    })
    const logs = await repo.reviews.all()
    expect(logs.some((l) => l.cardId === basicCard.id)).toBe(false)

    // Undo must restore CardState too, not just Card.scheduling (Phase D
    // requires undo stay correct under dual-write).
    const cardState = await repo.cardStates.getById(basicCard.id)
    expect(cardState?.reps).toBe(0)
    expect(cardState?.due).toBe(basicCard.scheduling.due)
  })
})
