// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import { DialogProvider } from '@/components/ui/dialogs'
import type { Deck } from '@/types'
import { LibraryBrowserPage } from './LibraryBrowserPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <DialogProvider>
        <MemoryRouter initialEntries={['/decks']}>
          <LibraryBrowserPage />
        </MemoryRouter>
      </DialogProvider>
    </QueryClientProvider>,
  )
}

const cpp: Deck = { id: 'cpp', name: 'C++', createdAt: 0, updatedAt: 0 }
const typeDeduction: Deck = { id: 'td', name: 'Type Deduction', parentId: 'cpp', createdAt: 0, updatedAt: 0 }
const misc: Deck = { id: 'misc', name: 'Odds and Ends', createdAt: 0, updatedAt: 0 }

describe('LibraryBrowserPage', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.decks.clear(), repo.cards.clear(), repo.cardsV2.clear()])
  })

  afterEach(() => cleanup())

  it('shows a deck with children as a Collection and only childless decks as Library deck rows', async () => {
    const repo = getRepository()
    await repo.decks.put(cpp)
    await repo.decks.put(typeDeduction)
    await repo.decks.put(misc)

    renderPage()

    // "C++" is a Collection in the nav (it has a child deck)...
    expect(await screen.findByRole('button', { name: /C\+\+/ })).toBeTruthy()
    // ...but is NOT itself a row in the deck list — only its leaf child and
    // the other top-level leaf deck are. "Type Deduction" now appears twice
    // (once nested in the sidebar's Collection tree, once as its own deck
    // row in the main list) - both are expected.
    expect(await screen.findAllByText('Type Deduction')).toHaveLength(2)
    expect(await screen.findByText('Odds and Ends')).toBeTruthy()
    const rows = screen.getAllByRole('button', { name: 'Deck actions' })
    expect(rows).toHaveLength(2) // Type Deduction + Odds and Ends, not C++
  })

  it('renders the All Decks identity and links Import Deck to the working JSON importer', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'All Decks' })).toBeTruthy()
    expect(screen.getByText('View and manage all your decks.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Import Deck' }).getAttribute('href')).toBe(
      '/settings/import-export',
    )
  })

  it('paginates All Decks at ten rows per page', async () => {
    const repo = getRepository()
    await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        repo.decks.put({
          id: `deck-${index}`,
          name: `Deck ${String(index).padStart(2, '0')}`,
          description: index === 0 ? 'The first deck description' : undefined,
          createdAt: index,
          updatedAt: index,
        }),
      ),
    )

    renderPage()

    expect(await screen.findAllByRole('button', { name: 'Deck actions' })).toHaveLength(10)
    expect(screen.getByText('The first deck description')).toBeTruthy()
    expect(screen.getByText('Showing 1-10 of 11 decks')).toBeTruthy()
    screen.getByRole('button', { name: '2', exact: true }).click()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Deck actions' })).toHaveLength(1)
      expect(screen.getByText('Showing 11-11 of 11 decks')).toBeTruthy()
    })
  })

  it('filters the deck list down to a selected collection', async () => {
    const repo = getRepository()
    await repo.decks.put(cpp)
    await repo.decks.put(typeDeduction)
    await repo.decks.put(misc)

    renderPage()
    await screen.findAllByText('Type Deduction')

    const collectionButton = await screen.findByRole('button', { name: /C\+\+/ })
    collectionButton.click()

    expect(await screen.findAllByText('Type Deduction')).toHaveLength(2)
    expect(screen.queryByText('Odds and Ends')).toBeNull()
  })

  it('shows the empty-library state when there are no decks', async () => {
    renderPage()
    expect(await screen.findByText('No decks yet')).toBeTruthy()
  })
})
