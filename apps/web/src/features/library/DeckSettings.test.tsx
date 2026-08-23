// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { DeckSettings } from './DeckSettings'

const deck: Deck = {
  id: 'deck-1',
  name: 'Original deck',
  description: 'Original description',
  createdAt: 0,
  updatedAt: 0,
}

function renderSettings(onClose: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DeckSettings deck={deck} decks={[deck]} onClose={onClose} />
    </QueryClientProvider>,
  )
}

describe('DeckSettings', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await repo.decks.clear()
    await repo.decks.put(deck)
  })

  afterEach(() => cleanup())

  it('closes after a successful save', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderSettings(onClose)

    const name = screen.getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Renamed deck')
    await user.click(screen.getByRole('button', { name: 'Save deck' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect((await getRepository().decks.getById(deck.id))?.name).toBe('Renamed deck')
  })

  it('lets Cancel close without saving', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderSettings(onClose)

    await user.type(screen.getByLabelText('Description (optional)'), ' changed')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect((await getRepository().decks.getById(deck.id))?.description).toBe(
      'Original description',
    )
  })
})
