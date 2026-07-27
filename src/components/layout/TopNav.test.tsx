// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getRepository } from '@/data'
import { TopNav } from './TopNav'
import { primaryNavLinks } from './primaryNavLinks'

function renderNav(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <TopNav navLinks={primaryNavLinks} rightSlot={<button>Custom action</button>} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TopNav', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.cards.clear(), repo.drafts.clear()])
  })

  afterEach(() => cleanup())

  it('renders every primary nav link plus a caller-supplied rightSlot', () => {
    renderNav('/decks')
    expect(screen.getByRole('link', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Library' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Progress' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Custom action' })).toBeTruthy()
  })

  it('marks only the link matching the current path as active', () => {
    renderNav('/stats')
    expect(screen.getByRole('link', { name: 'Progress' }).className).toMatch(/border-itera-accent/)
    expect(screen.getByRole('link', { name: 'Today' }).className).not.toMatch(/border-itera-accent/)
    expect(screen.getByRole('link', { name: 'Library' }).className).not.toMatch(/border-itera-accent/)
  })

  it('matches Today only exactly at "/", not as a prefix of every route', () => {
    renderNav('/decks')
    expect(screen.getByRole('link', { name: 'Today' }).className).not.toMatch(/border-itera-accent/)
  })
})
