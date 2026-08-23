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
      'Spaced repetition (FSRS)',
      'Import / Export',
      'Keyboard shortcuts',
      'Help & documentation',
      "What's new",
      'About Itera',
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

  it('marks every not-yet-built row as disabled and navigates nowhere when one is clicked', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const placeholders = [
      'Preferences',
      'Study settings',
      'Spaced repetition',
      'Keyboard shortcuts',
      'Help & documentation',
      "What's new",
      'About Itera',
    ]
    for (const label of placeholders) {
      const item = screen.getByRole('menuitem', { name: new RegExp(label) })
      expect(item.getAttribute('aria-disabled')).toBe('true')
    }
    // Sign out is disabled while signed out (no local or Supabase session).
    expect(screen.getByRole('menuitem', { name: /Sign out/ }).getAttribute('aria-disabled')).toBe(
      'true',
    )

    await user.click(screen.getByRole('menuitem', { name: /Preferences/ }))
    expect(screen.getByTestId('pathname').textContent).toBe('/decks')
    expect(screen.getByRole('menu')).toBeTruthy()
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

  // /settings/card-scheduling is not a section in settingsSections.ts, so this
  // row used to navigate to Profile while looking like a real destination.
  it('offers Spaced repetition as a placeholder, not a link to a section that does not exist', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const row = screen.getByRole('menuitem', { name: /Spaced repetition/ })

    expect(row.getAttribute('href')).toBeNull()
    expect(row.getAttribute('aria-disabled')).toBe('true')
    expect(row.textContent).toContain('Soon')

    await user.click(row)
    expect(screen.getByTestId('pathname').textContent).toBe('/decks')
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
