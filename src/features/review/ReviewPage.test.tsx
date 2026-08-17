// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { ReviewPage } from './ReviewPage'

const deck: Deck = {
  id: 'deck-1',
  name: 'Compilers',
  createdAt: 0,
  updatedAt: 0,
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
