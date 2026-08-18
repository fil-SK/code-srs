// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { CardCreatePage } from './CardCreatePage'

const deck: Deck = { id: 'deck-1', name: 'C++', createdAt: 0, updatedAt: 0 }

function renderCreateFlow() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [{ path: 'decks/:deckId/cards/new', element: <CardCreatePage /> }],
      },
    ],
    { initialEntries: ['/decks/deck-1/cards/new'] },
  )
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

// Regression guard for the App Shell convergence milestone: CardEditorShell
// used to sync AppShell's old topbar via useSetPageHeader to suppress a
// competing "Decks" title + "Study now" CTA. Both the old topbar and that
// override mechanism are gone now — this confirms the card editor's own
// header is the only "Create card" heading on the page (no leftover
// duplicate from anywhere in the shell) and that the shared shell's "Study
// now"-style global CTA doesn't reappear here.
describe('CardCreatePage under the shared AppShell', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.decks.clear(), repo.cards.clear()])
    await repo.decks.put(deck)
  })

  afterEach(() => cleanup())

  it('renders the reference-aligned New card heading and complete default Recall form', async () => {
    renderCreateFlow()

    expect(await screen.findAllByText('New card')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Recall' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('2. Card content')).toBeTruthy()
    expect(screen.getByText('3. Organize')).toBeTruthy()
    expect(screen.queryByText('Decks')).toBeNull()
    expect(screen.queryByRole('link', { name: /Study now/i })).toBeNull()
  })

  it('keeps both cancel affordances and the footer action hierarchy', async () => {
    renderCreateFlow()

    expect(await screen.findAllByRole('button', { name: 'Cancel' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Save card' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Preview card' })).toBeTruthy()
  })

  it('warns without blocking when a prompt is too long for a focused flashcard', async () => {
    const user = userEvent.setup()
    renderCreateFlow()

    await user.click(await screen.findByRole('button', { name: 'Recall' }))
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'A'.repeat(281) } })

    expect(await screen.findByText('This prompt is unusually long.')).toBeTruthy()
    expect(screen.getByText(/Consider shortening it or splitting it/)).toBeTruthy()
  })
})
