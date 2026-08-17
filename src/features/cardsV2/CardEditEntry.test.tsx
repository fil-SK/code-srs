// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getRepository } from '@/data'
import { initialSchedulingState } from '@/domain/scheduling/state'
import type { Card } from '@/types'
import { CardEditEntry } from './CardEditEntry'

function basicCard(id: string): Card {
  return {
    id,
    deckId: 'deck-1',
    type: 'basic',
    content: { front: 'Q', back: 'A' },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling: initialSchedulingState(0),
  }
}

function renderAt(id: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/cards/${id}/edit`]}>
        <Routes>
          <Route path="/cards/:id/edit" element={<CardEditEntry />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CardEditEntry', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.cards.clear(), repo.cardsV2.clear()])
  })

  afterEach(() => cleanup())

  // Every one of the 8 v1 CardType members is handled by a v2 editor branch, so
  // the final fallthrough is only reachable for an id that resolves to neither
  // model. It used to render the v1 registry editor, which no longer exists.
  it('shows a not-found state for an id that matches neither card model', async () => {
    renderAt('does-not-exist')

    expect(await screen.findByText('Card not found')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Library' }).getAttribute('href')).toBe(
      '/decks',
    )
  })

  it('opens a v1 basic card in the Recall editor rather than the not-found state', async () => {
    await getRepository().cards.put(basicCard('card-1'))

    renderAt('card-1')

    // The Recall editor seeds its prompt field from the legacy card.
    expect(await screen.findByDisplayValue('Q')).toBeTruthy()
    expect(screen.queryByText('Card not found')).toBeNull()
  })
})
