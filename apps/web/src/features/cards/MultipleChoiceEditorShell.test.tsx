// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { emptyMultipleChoiceForm } from '@/domain/cards/multipleChoiceForm'
import { MultipleChoiceEditorShell } from './MultipleChoiceEditorShell'

const deck: Deck = { id: 'deck-1', name: 'C++', createdAt: 0, updatedAt: 0 }

function renderShell(onSaved: (record: unknown) => void = () => {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MultipleChoiceEditorShell
          mode="create"
          initialForm={emptyMultipleChoiceForm('deck-1')}
          target={{ kind: 'new' }}
          backTo="/decks"
          onSaved={onSaved}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MultipleChoiceEditorShell', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.decks.clear(), repo.cards.clear()])
    await repo.decks.put(deck)
  })

  afterEach(() => cleanup())

  it('disables Save while the form is invalid, enables it once valid', async () => {
    const user = userEvent.setup()
    renderShell()

    const save = await screen.findByRole('button', { name: 'Save card' })
    expect((save as HTMLButtonElement).disabled).toBe(true)

    await user.type(screen.getByPlaceholderText(/Which of these/), 'Which type is a value type?')
    const optionInputs = screen.getAllByPlaceholderText('Option text')
    await user.type(optionInputs[0], 'int')
    await user.type(optionInputs[1], 'unique_ptr')
    await user.click(screen.getAllByRole('radio', { name: /Mark option/ })[0])

    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
  })

  it('persists the card via saveMultipleChoiceCard and calls onSaved once Save is clicked', async () => {
    const user = userEvent.setup()
    let saved: { id: string; deckId: string } | undefined
    renderShell((record) => {
      saved = record as { id: string; deckId: string }
    })

    await user.type(screen.getByPlaceholderText(/Which of these/), 'Which type is a value type?')
    const optionInputs = screen.getAllByPlaceholderText('Option text')
    await user.type(optionInputs[0], 'int')
    await user.type(optionInputs[1], 'unique_ptr')
    await user.click(screen.getAllByRole('radio', { name: /Mark option/ })[0])

    await user.click(await screen.findByRole('button', { name: 'Save card' }))

    await waitFor(() => expect(saved).toBeDefined())
    const repo = getRepository()
    const persisted = await repo.cards.getById(saved!.id)
    expect(persisted?.deckId).toBe('deck-1')
    expect(persisted?.interaction.type).toBe('multiple_choice')
  })
})
