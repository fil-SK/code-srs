// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { emptyWriteCodeForm } from '@/domain/cardsV2/writeCodeForm'
import { WriteCodeEditorShell } from './WriteCodeEditorShell'

// Real CodeMirror 6 (LazyCodeEditor -> CodeEditor) has no existing precedent
// mounted under happy-dom in this repo, and depends on DOM measurement APIs
// that jsdom-like environments can stub incompletely. This shell test only
// needs to exercise WriteCodeFields'/WriteCodeEditorShell's own state and
// save wiring, not CodeMirror's rendering, so LazyCodeEditor is replaced with
// a minimal textarea stub carrying the same `.cm-editor` class CodeMirror's
// real root uses (relevant to ReviewSessionScreen's keyboard guard, exercised
// separately in WriteCodeView.test.tsx).
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
        <WriteCodeEditorShell
          mode="create"
          initialForm={emptyWriteCodeForm('deck-1')}
          target={{ kind: 'new' }}
          backTo="/decks"
          onSaved={onSaved}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WriteCodeEditorShell', () => {
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

    await user.type(
      screen.getByPlaceholderText(/Write a function/),
      'Sum all elements in v.',
    )
    // [0] is the starter-code editor, [1] is the first accepted answer's.
    const editors = screen.getAllByTestId('mock-code-editor')
    await user.type(editors[1], 'return 0;')

    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
  })

  it('persists the card via saveWriteCodeCard and calls onSaved once Save is clicked', async () => {
    const user = userEvent.setup()
    let saved: { id: string; deckId: string } | undefined
    renderShell((record) => {
      saved = record as { id: string; deckId: string }
    })

    await user.type(
      screen.getByPlaceholderText(/Write a function/),
      'Sum all elements in v.',
    )
    const editors = screen.getAllByTestId('mock-code-editor')
    await user.type(editors[1], 'return 0;')

    await user.click(await screen.findByRole('button', { name: 'Save card' }))

    await waitFor(() => expect(saved).toBeDefined())
    const repo = getRepository()
    const persisted = await repo.cardsV2.getById(saved!.id)
    expect(persisted?.deckId).toBe('deck-1')
    expect(persisted?.interaction.type).toBe('write_code')
  })
})
