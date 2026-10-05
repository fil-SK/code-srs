// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/app/theme'
import { AboutPage } from './AboutPage'

const auth = vi.hoisted(() => ({ mode: 'local' as 'local' | 'supabase' }))
vi.mock('@fliptap/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@fliptap/core')>(),
  useAuth: () => auth,
}))

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('AboutPage storage explanation', () => {
  afterEach(() => {
    cleanup()
    auth.mode = 'local'
  })

  it('explains browser-local storage and points to the working backup route', () => {
    renderPage()
    expect(screen.getByText('Local storage')).toBeTruthy()
    expect(screen.getByText(/you can keep studying offline/)).toBeTruthy()
    expect(screen.queryByText('Cloud storage')).toBeNull()
    expect(screen.getByRole('link', { name: 'Import / Export' }).getAttribute('href')).toBe('/settings/import-export')
  })

  it('describes the cloud connection requirement without promising local or offline storage', () => {
    auth.mode = 'supabase'
    renderPage()
    expect(screen.getByText('Cloud storage')).toBeTruthy()
    expect(screen.getByText(/You need an internet connection/)).toBeTruthy()
    expect(screen.queryByText('Local storage')).toBeNull()
    expect(screen.queryByText(/you can keep studying offline/)).toBeNull()
  })
})
