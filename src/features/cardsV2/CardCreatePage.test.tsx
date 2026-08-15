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
import { STICKY_TOP_VAR } from './CardEditorShell'

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
    await Promise.all([repo.decks.clear(), repo.cardsV2.clear()])
    await repo.decks.put(deck)
  })

  afterEach(() => cleanup())

  it('renders exactly one "Create card" heading, with no duplicate/legacy topbar', async () => {
    const user = userEvent.setup()
    renderCreateFlow()

    await user.click(await screen.findByRole('button', { name: 'Recall' }))

    expect(await screen.findAllByText('Create card')).toHaveLength(1)
    expect(screen.queryByText('Decks')).toBeNull()
    expect(screen.queryByRole('link', { name: /Study now/i })).toBeNull()
  })

  // happy-dom has no layout, so this cannot prove the editor's action header
  // actually parks below the chooser (D132 - that needs a browser), and it
  // drops the header's own `top: var(...)` outright. What it does guard is
  // that the page still measures its chooser and publishes the offset the
  // shell reads: drop the ResizeObserver and the header silently pins to 0,
  // overlapping the chooser. Both sides share STICKY_TOP_VAR, so the name
  // itself cannot drift.
  it('measures its sticky chooser into the offset the editor header reads', async () => {
    const user = userEvent.setup()
    const { container } = renderCreateFlow()

    await user.click(await screen.findByRole('button', { name: 'Recall' }))

    const publisher = container.querySelector('.sticky.top-0')?.parentElement as HTMLElement
    expect(publisher.style.getPropertyValue(STICKY_TOP_VAR)).toMatch(/^\d+(\.\d+)?px$/)
    expect(container.querySelector('.card-editor-shell header')).toBeTruthy()
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
