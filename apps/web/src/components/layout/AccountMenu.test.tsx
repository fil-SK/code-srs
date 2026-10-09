// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { createWebAuthConfig } from '@/auth/webAuthConfig'
import { isSupabaseConfigured } from '@/data/supabase/client'
import { AccountMenu } from './AccountMenu'

function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

function renderMenu() {
  return render(
    <AuthProvider config={createWebAuthConfig(isSupabaseConfigured)}>
      <MemoryRouter initialEntries={['/decks']}>
        <button type="button">outside</button>
        <AccountMenu />
        <LocationProbe />
        <Routes>
          <Route path="/decks" element={<div>Library</div>} />
          <Route path="/settings" element={<div>Account settings page</div>} />
          <Route path="/about" element={<div>About page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

const trigger = () => screen.getByRole('button', { name: 'Open account menu' })

describe('AccountMenu', () => {
  afterEach(() => cleanup())

  it('toggles open and closed from the avatar trigger', async () => {
    const user = userEvent.setup()
    renderMenu()

    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()

    await user.click(trigger())
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')

    await user.click(trigger())
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    // Focus moves into the menu, landing on the first item that is not a
    // disabled placeholder.
    await waitFor(() =>
      expect(document.activeElement?.textContent).toContain('Account settings'),
    )

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('closes on an outside click', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    expect(screen.getByRole('menu')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('moves focus between items with the arrow keys, including disabled rows', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const items = screen.getAllByRole('menuitem')
    expect(items.map((i) => i.textContent?.replace('Soon', '').trim())).toEqual([
      'Account settings',
      'Preferences',
      'Study settings',
      'Import / Export',
      'Help & Support',
      'About FlipTap',
      'Sign out',
    ])

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[1])
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(items[0])
    // Wrapping backwards from the first item reaches the last one.
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(items[items.length - 1])
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(items[0])
  })

  it('keeps Sign out unavailable while signed out', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(trigger())
    expect(screen.getByRole('menuitem', { name: /Sign out/ }).getAttribute('aria-disabled')).toBe('true')
  })
  it('opens Appearance from the Preferences shortcut', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(trigger())
    const link = screen.getByRole('menuitem', { name: 'Preferences' })
    expect(link.getAttribute('href')).toBe('/settings/appearance')
    expect(link.hasAttribute('aria-disabled')).toBe(false)
    await user.click(link)
    expect(screen.getByTestId('pathname').textContent).toBe('/settings/appearance')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('navigates to the full Account settings page and closes', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const link = screen.getByRole('menuitem', { name: 'Account settings' })
    expect(link.getAttribute('href')).toBe('/settings')

    await user.click(link)
    expect(screen.getByTestId('pathname').textContent).toBe('/settings')
    expect(screen.getByText('Account settings page')).toBeTruthy()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('links the Import / Export section directly', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())

    expect(screen.getByRole('menuitem', { name: 'Import / Export' }).getAttribute('href')).toBe(
      '/settings/import-export',
    )
  })

  it('opens About FlipTap as a live destination and closes the menu', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const link = screen.getByRole('menuitem', { name: 'About FlipTap' })
    expect(link.getAttribute('href')).toBe('/about')
    expect(link.hasAttribute('aria-disabled')).toBe(false)
    expect(link.textContent).not.toContain('Soon')

    await user.click(link)
    expect(screen.getByTestId('pathname').textContent).toBe('/about')
    expect(screen.getByText('About page')).toBeTruthy()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('groups FSRS under Study settings and shortcuts under Help & Support', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(trigger())
    expect(screen.queryByRole('menuitem', { name: /Spaced repetition|Keyboard shortcuts|What's new/ })).toBeNull()
    const study = screen.getByRole('menuitem', { name: 'Study settings' })
    expect(study.getAttribute('href')).toBe('/settings/study')
    const help = screen.getByRole('menuitem', { name: 'Help & Support' })
    expect(help.getAttribute('href')).toBe('/help')
    await user.click(help)
    expect(screen.getByTestId('pathname').textContent).toBe('/help')
    expect(screen.queryByRole('menu')).toBeNull()
  })
  it('shows a real identity instead of a fabricated display name', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())

    // No session in this test environment, so the block says exactly that
    // rather than rendering a placeholder person.
    expect(screen.queryByText('Your name')).toBeNull()
    expect(screen.getByText('Not signed in')).toBeTruthy()
    expect(screen.getByText('Local data only')).toBeTruthy()
  })
})
