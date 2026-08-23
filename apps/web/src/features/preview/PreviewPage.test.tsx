// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { getRepository } from '@/data'
import { initialSchedulingState } from '@/domain/scheduling/state'
import type { Card, Deck } from '@/types'
import { richText } from '@/types/card'
import { PreviewPage } from './PreviewPage'

const deck: Deck = {
  id: 'deck-1',
  name: 'Test deck',
  createdAt: 0,
  updatedAt: 0,
}

function card(id: string, front: string, order: number): Card {
  return {
    id,
    schemaVersion: 2,
    deckId: deck.id,
    prompt: richText(front),
    interaction: { type: 'recall', answer: richText(`${front} answer`) },
    tags: [],
    createdAt: order,
    updatedAt: order,
    order,
    suspended: false,
    scheduling: initialSchedulingState(0),
  }
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

function renderPage(entry = '/preview?deck=deck-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <PreviewPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PreviewPage deck navigation', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.decks.clear(), repo.cards.clear()])
    await repo.decks.put(deck)
    await repo.cards.bulkPut([
      card('card-1', 'First prompt', 0),
      card('card-2', 'Second prompt', 1),
    ])
  })

  afterEach(() => cleanup())

  it('places Prev and Next around the position and supports arrow keys', async () => {
    renderPage()

    const position = await screen.findByText('1 of 2')
    const banner = screen.getByRole('banner')
    const previous = screen.getByRole('button', { name: 'Previous card' })
    const next = screen.getByRole('button', { name: 'Next card' })

    expect(banner.contains(previous)).toBe(true)
    expect(banner.contains(position)).toBe(true)
    expect(banner.contains(next)).toBe(true)
    expect(previous.hasAttribute('disabled')).toBe(true)
    expect(next.hasAttribute('disabled')).toBe(false)

    const right = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    fireEvent(window, right)

    expect(right.defaultPrevented).toBe(true)
    await waitFor(() => expect(screen.getByText('2 of 2')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Next card' }).hasAttribute('disabled')).toBe(
      true,
    )

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByText('1 of 2')).toBeTruthy())

    screen.getByRole('button', { name: 'Next card' }).click()
    await waitFor(() => expect(screen.getByText('2 of 2')).toBeTruthy())
  })

  // Single-card mode used to fall back to the v1 /browse page, which no longer
  // exists. The card carries its own deckId, so Exit returns to that deck.
  it('exits a single-card preview to the card’s own deck when no `from` is given', async () => {
    renderPage('/preview?card=card-2')

    await screen.findByRole('banner')
    screen.getByRole('button', { name: /Exit session/ }).click()

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/decks/deck-1'),
    )
  })

  it('prefers an explicit `from` over the derived deck', async () => {
    renderPage('/preview?card=card-2&from=%2Fdecks')

    await screen.findByRole('banner')
    screen.getByRole('button', { name: /Exit session/ }).click()

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/decks'))
  })
})
