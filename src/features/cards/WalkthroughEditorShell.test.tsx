// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { emptyWalkthroughForm } from '@/domain/cards/walkthroughForm'
import { WalkthroughEditorShell } from './WalkthroughEditorShell'

// Same rationale as WriteCodeEditorShell.test.tsx: real CodeMirror 6 has no
// existing precedent mounted under happy-dom, and this shell test only needs
// to exercise WalkthroughFields'/WalkthroughEditorShell's own state and save
// wiring, not CodeMirror's rendering.
vi.mock('@/components/code/LazyCodeEditor', () => ({
  LazyCodeEditor: ({
    value,
    onChange,
  }: {
    value: string
    language: string
    onChange: (value: string) => void
  }) => (
    <textarea
      className="cm-editor"
      data-testid="mock-code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

const deck: Deck = { id: 'deck-1', name: 'C++', createdAt: 0, updatedAt: 0 }

function renderShell(onSaved: (record: unknown) => void = () => {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WalkthroughEditorShell
          mode="create"
          initialForm={emptyWalkthroughForm('deck-1')}
          target={{ kind: 'new' }}
          backTo="/decks"
          onSaved={onSaved}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/Trace what happens/), 'Trace it')
  await user.type(screen.getByPlaceholderText(/The context every step/), 'Scenario context')
  await user.type(screen.getByPlaceholderText(/What should the learner/), 'What happens first?')
  await user.type(screen.getByPlaceholderText(/The answer revealed/), 'The answer')
}

describe('WalkthroughEditorShell', () => {
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

    await fillValidForm(user)

    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
  })

  it('persists the card via saveWalkthroughCard and calls onSaved once Save is clicked', async () => {
    const user = userEvent.setup()
    let saved: { id: string; deckId: string } | undefined
    renderShell((record) => {
      saved = record as { id: string; deckId: string }
    })

    await fillValidForm(user)

    await user.click(await screen.findByRole('button', { name: 'Save card' }))

    await waitFor(() => expect(saved).toBeDefined())
    const repo = getRepository()
    const persisted = await repo.cards.getById(saved!.id)
    expect(persisted?.deckId).toBe('deck-1')
    expect(persisted?.interaction.type).toBe('walkthrough')
  })
})
