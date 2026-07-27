// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { emptyMatchingForm } from '@/domain/cardsV2/matchingForm'
import { MatchingEditorShell } from './MatchingEditorShell'

const deck: Deck = { id: 'deck-1', name: 'C++', createdAt: 0, updatedAt: 0 }

function renderShell(onSaved: (record: unknown) => void = () => {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MatchingEditorShell
          mode="create"
          initialForm={emptyMatchingForm('deck-1')}
          target={{ kind: 'new' }}
          backTo="/decks"
          onSaved={onSaved}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByPlaceholderText('Match each term to its definition.'),
    'Match each term to its definition.',
  )
  const sourceInputs = screen.getAllByPlaceholderText('Term')
  await user.type(sourceInputs[0], 'Stack')
  await user.type(sourceInputs[1], 'Heap')
  await user.type(sourceInputs[2], 'Register')

  const cellInputs = screen.getAllByPlaceholderText('Match')
  await user.type(cellInputs[0], 'LIFO frames')
  await user.type(cellInputs[1], 'Manually managed')
  await user.type(cellInputs[2], 'Fastest access')
}

describe('MatchingEditorShell', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.decks.clear(), repo.cardsV2.clear()])
    await repo.decks.put(deck)
  })

  afterEach(() => cleanup())

  it('disables Save while the form is invalid, enables it once valid', async () => {
    const user = userEvent.setup()
    renderShell()

    const save = await screen.findByRole('button', { name: 'Save card' })
    expect((save as HTMLButtonElement).disabled).toBe(true)

    await fillValidForm(user)

    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
  })

  it('persists the card via saveMatchingCard and calls onSaved once Save is clicked', async () => {
    const user = userEvent.setup()
    let saved: { id: string; deckId: string } | undefined
    renderShell((record) => {
      saved = record as { id: string; deckId: string }
    })

    await fillValidForm(user)

    await user.click(await screen.findByRole('button', { name: 'Save card' }))

    await waitFor(() => expect(saved).toBeDefined())
    const repo = getRepository()
    const persisted = await repo.cardsV2.getById(saved!.id)
    expect(persisted?.deckId).toBe('deck-1')
    expect(persisted?.interaction.type).toBe('matching')
  })
})
