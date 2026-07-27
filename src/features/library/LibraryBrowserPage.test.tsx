// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import type { Deck } from '@/types'
import { LibraryBrowserPage } from './LibraryBrowserPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/decks']}>
        <LibraryBrowserPage />
      </MemoryRouter>
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
    // the other top-level leaf deck are.
    expect(await screen.findByText('Type Deduction')).toBeTruthy()
    expect(await screen.findByText('Odds and Ends')).toBeTruthy()
    const rows = screen.getAllByRole('button', { name: 'Deck actions' })
    expect(rows).toHaveLength(2) // Type Deduction + Odds and Ends, not C++
  })

  it('filters the deck list down to a selected collection', async () => {
    const repo = getRepository()
    await repo.decks.put(cpp)
    await repo.decks.put(typeDeduction)
    await repo.decks.put(misc)

    renderPage()
    await screen.findByText('Type Deduction')

    const collectionButton = await screen.findByRole('button', { name: /C\+\+/ })
    collectionButton.click()

    expect(await screen.findByText('Type Deduction')).toBeTruthy()
    expect(screen.queryByText('Odds and Ends')).toBeNull()
  })

  it('shows the empty-library state when there are no decks', async () => {
    renderPage()
    expect(await screen.findByText('No decks yet')).toBeTruthy()
  })
})
