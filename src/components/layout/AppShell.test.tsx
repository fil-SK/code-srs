// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { getRepository } from '@/data'
import { AppShell } from './AppShell'

// Structural regression guard for the App Shell convergence milestone: the
// pathless AppShell layout route renders the shared TopNav (logo, primary
// nav, active-link state) around any of its children, while a route that is
// NOT nested under AppShell (Review's real position in src/app/router.tsx)
// renders with none of that chrome — verified structurally (element absence)
// rather than via CSS visibility, matching how Review is actually wired.
function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <div>Today content</div> },
          { path: 'decks', element: <div>Decks content</div> },
          { path: 'stats', element: <div>Stats content</div> },
        ],
      },
      { path: 'review', element: <div>Review content</div> },
    ],
    { initialEntries: [path] },
  )
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('AppShell', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await Promise.all([repo.decks.clear(), repo.cards.clear(), repo.drafts.clear()])
  })

  afterEach(() => cleanup())

  it('renders the shared TopNav with all primary destinations on a standard route', async () => {
    renderAt('/decks')
    expect(await screen.findByText('Itera')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Library' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Progress' })).toBeTruthy()
    expect(screen.getByText('Decks content')).toBeTruthy()
  })

  it('marks the nav link matching the current route as active', async () => {
    renderAt('/decks')
    const library = await screen.findByRole('link', { name: 'Library' })
    const today = screen.getByRole('link', { name: 'Today' })
    expect(library.className).toMatch(/border-itera-accent/)
    expect(today.className).not.toMatch(/border-itera-accent/)
  })

  it('renders a Profile menu and no global Search or Create action', async () => {
    renderAt('/decks')
    expect(await screen.findByRole('button', { name: 'Profile' })).toBeTruthy()
    expect(screen.queryByText('Search')).toBeNull()
    expect(screen.queryByRole('button', { name: /Create/ })).toBeNull()
  })

  it('does not render the shared shell around a route outside AppShell (Review)', async () => {
    renderAt('/review')
    expect(await screen.findByText('Review content')).toBeTruthy()
    expect(screen.queryByText('Itera')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Library' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Profile' })).toBeNull()
  })
})
