// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { createWebAuthConfig } from '@/auth/webAuthConfig'
import { isSupabaseConfigured } from '@/data/supabase/client'
import { DialogProvider } from '@/components/ui/dialogs'
import { AccountSettingsPage } from './AccountSettingsPage'

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider config={createWebAuthConfig(isSupabaseConfigured)}>
        <DialogProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/settings" element={<AccountSettingsPage />} />
              <Route path="/settings/:section" element={<AccountSettingsPage />} />
            </Routes>
          </MemoryRouter>
        </DialogProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('AccountSettingsPage', () => {
  afterEach(() => cleanup())

  it('lands on Profile, with every control inert', () => {
    renderAt('/settings')

    expect(screen.getByRole('heading', { name: 'Account settings', level: 1 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Profile', level: 2 })).toBeTruthy()
    expect(screen.getByPlaceholderText('Your name').hasAttribute('disabled')).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Save changes' }).getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: 'Delete account' }).getAttribute('aria-disabled'),
    ).toBe('true')
  })

  it('offers the mockup sections but not Billing or Plan & usage', () => {
    renderAt('/settings')

    for (const label of [
      'Profile',
      'Email & password',
      'Appearance',
      'Notifications',
      'Privacy',
      'Connected devices',
      'Import / Export',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy()
    }
    expect(screen.queryByRole('link', { name: /Billing/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Plan & usage/ })).toBeNull()
  })

  it('keeps Import / Export a real, working section', () => {
    renderAt('/settings/import-export')

    expect(screen.getByRole('button', { name: /Export JSON/ }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: /Import JSON/ }).hasAttribute('disabled')).toBe(false)
  })


  it('falls back to Profile for an unknown section slug', () => {
    renderAt('/settings/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Profile', level: 2 })).toBeTruthy()
  })
})
