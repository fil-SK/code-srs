// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Card, Deck } from '@/types'
import { richText } from '@/types/card'
import { ReviewPage } from './ReviewPage'

const deck: Deck = {
  id: 'deck-1',
  name: 'Compilers',
  createdAt: 0,
  updatedAt: 0,
}

function dueCard(id: string, dueOffsetMs: number): Card {
  return {
    id,
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: richText(`Question ${id}`),
    interaction: { type: 'recall', answer: richText(`Answer ${id}`) },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling: {
      due: Date.now() + dueOffsetMs,
      stability: 4,
      difficulty: 5,
      elapsedDays: 1,
      scheduledDays: 4,
      reps: 2,
      lapses: 0,
      learningSteps: 0,
      state: 'review',
    },
  }
}

function renderPage(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <ReviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// The empty state used to offer "New card" -> /cards/new, the unlinked v1
// editor that has since been deleted. Creating a card requires a deck, so the
// CTA now points at a real redesigned destination instead.
describe('ReviewPage empty state', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.cards.clear(), repo.decks.clear()])
    await repo.decks.put(deck)
  })

  afterEach(() => cleanup())

  it('sends an unscoped session with nothing due to the Library', async () => {
    renderPage('/review')

    const cta = await screen.findByRole('link', { name: 'Go to Library' })
    expect(cta.getAttribute('href')).toBe('/decks')
    expect(screen.queryByRole('link', { name: 'New card' })).toBeNull()
  })

  it('sends a deck-scoped session with nothing due to that deck', async () => {
    renderPage('/review?deck=deck-1')

    const cta = await screen.findByRole('link', { name: 'Open deck' })
    expect(cta.getAttribute('href')).toBe('/decks/deck-1')
    // The secondary escape hatch back to an all-decks session stays.
    expect(screen.getByRole('link', { name: 'All decks' }).getAttribute('href')).toBe('/review')
  })
})

// `limit` is a transient session size, never persisted. A URL that carries a
// nonsense value should still start a usable session rather than error or
// silently study nothing.
describe('ReviewPage limit parameter', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.cards.clear(), repo.decks.clear(), repo.reviews.clear()])
    await repo.decks.put(deck)
    await repo.cards.bulkPut([
      dueCard('a', -4 * 3_600_000),
      dueCard('b', -3 * 3_600_000),
      dueCard('c', -2 * 3_600_000),
    ])
  })

  afterEach(() => cleanup())

  it('takes the first n cards of the queue', async () => {
    renderPage('/review?limit=2')
    expect(await screen.findByText('1 of 2')).toBeTruthy()
    expect(screen.getByText('Question a')).toBeTruthy()
  })

  it.each(['0', '-3', 'abc', '2.5', ''])('ignores the malformed limit %o', async (raw) => {
    renderPage(`/review?limit=${raw}`)
    expect(await screen.findByText('1 of 3')).toBeTruthy()
  })

  it('caps at what is available rather than inventing cards', async () => {
    renderPage('/review?limit=50')
    expect(await screen.findByText('1 of 3')).toBeTruthy()
  })
})
