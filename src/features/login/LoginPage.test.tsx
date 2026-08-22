// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AuthProvider } from '@/auth/AuthProvider'
import { readLocalSession } from '@/auth/localSession'
import { LoginPage } from './LoginPage'

// Local mode by default, so every test below this line is unaffected. The Supabase
// block flips the flag; see src/auth/RequireAuth.test.tsx for the same seam.
const sb = vi.hoisted(() => ({
  configured: false,
  getSession: vi.fn(async () => ({ data: { session: null as Session | null } })),
}))

vi.mock('@/data/supabase/client', () => ({
  get isSupabaseConfigured() {
    return sb.configured
  },
  getSupabase: () => ({
    auth: {
      getSession: () => sb.getSession(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: async () => ({ error: null }),
    },
  }),
}))

function fakeSession(email: string): Session {
  return { access_token: 't', user: { id: 'u1', email } } as unknown as Session
}

function seedLocalSession() {
  window.localStorage.setItem(
    'itera.session',
    JSON.stringify({ id: 'x', email: 'stale@local.test', kind: 'local', createdAt: '' }),
  )
}

function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

function renderLogin(initial: string | { pathname: string; state?: unknown } = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <LocationProbe />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Today</div>} />
          <Route path="/review" element={<div>Review</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('renders labelled email and password fields with the right autocomplete hints', () => {
    renderLogin()

    const email = screen.getByLabelText('Email') as HTMLInputElement
    const password = screen.getByLabelText('Password') as HTMLInputElement

    expect(email.type).toBe('email')
    expect(email.getAttribute('autocomplete')).toBe('email')
    expect(password.type).toBe('password')
    expect(password.getAttribute('autocomplete')).toBe('current-password')
  })

  it('toggles password visibility from an accessible button', async () => {
    const user = userEvent.setup()
    renderLogin()

    const password = screen.getByLabelText('Password') as HTMLInputElement
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password.type).toBe('text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password.type).toBe('password')
  })

  it('reports an empty submit through an error tied to the field', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const email = screen.getByLabelText('Email')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    const errorId = email.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    expect(document.getElementById(errorId as string)?.textContent).toContain(
      'Enter your email address.',
    )
    // No session was created, and nothing navigated.
    expect(readLocalSession()).toBeNull()
    expect(screen.getByTestId('pathname').textContent).toBe('/login')
  })

  it('rejects a malformed email', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('alert').textContent).toContain('Enter a valid email address.')
    expect(readLocalSession()).toBeNull()
  })

  it('requires a password before signing in', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'someone@example.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('alert').textContent).toContain('Enter your password.')
    expect(readLocalSession()).toBeNull()
  })

  it('signs in with a valid submission and lands on Today', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'someone@example.com')
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const session = readLocalSession()
    expect(session?.email).toBe('someone@example.com')
    expect(session?.kind).toBe('local')
    expect(screen.getByTestId('pathname').textContent).toBe('/')
    expect(screen.getByText('Today')).toBeTruthy()
  })

  it('submits on Enter from within the form', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'someone@example.com')
    await user.type(screen.getByLabelText('Password'), 'hunter2{Enter}')

    expect(readLocalSession()?.email).toBe('someone@example.com')
    expect(screen.getByTestId('pathname').textContent).toBe('/')
  })

  it('scopes the session to the tab when Remember me is left unchecked', async () => {
    const user = userEvent.setup()
    renderLogin()

    expect((screen.getByLabelText('Remember me') as HTMLInputElement).checked).toBe(false)
    await user.type(screen.getByLabelText('Email'), 'someone@example.com')
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(window.localStorage.getItem('itera.session')).toBeNull()
    expect(window.sessionStorage.getItem('itera.session')).toBeTruthy()
  })

  it('persists the session across restarts when Remember me is checked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByLabelText('Remember me'))
    await user.type(screen.getByLabelText('Email'), 'someone@example.com')
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(window.localStorage.getItem('itera.session')).toBeTruthy()
    expect(window.sessionStorage.getItem('itera.session')).toBeNull()
  })

  it('creates a demo session from the demo workspace button', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Continue with demo workspace/ }))

    expect(readLocalSession()?.kind).toBe('demo')
    expect(screen.getByTestId('pathname').textContent).toBe('/')
  })

  it('explains the forgot-password placeholder instead of navigating', async () => {
    const user = userEvent.setup()
    renderLogin()

    const link = screen.getByRole('button', { name: 'Forgot password?' })
    expect(link.getAttribute('aria-disabled')).toBe('true')

    await user.click(link)
    expect(screen.getByText(/Password reset is not available yet/)).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toBe('/login')
  })

  it('redirects away when a session already exists', () => {
    window.sessionStorage.setItem(
      'itera.session',
      JSON.stringify({ id: 'x', email: 'a@b.com', kind: 'local', createdAt: '' }),
    )
    renderLogin()

    expect(screen.getByTestId('pathname').textContent).toBe('/')
    expect(screen.getByText('Today')).toBeTruthy()
  })
})

// Audit P1-3: the local-mode counterpart is "redirects away when a session already
// exists" above. With Supabase configured that same stale record must not redirect,
// or the user is bounced off the only page that can sign them in.
describe('LoginPage - Supabase mode', () => {
  beforeEach(() => {
    sb.configured = true
    sb.getSession.mockClear()
    sb.getSession.mockResolvedValue({ data: { session: null } })
  })

  afterEach(() => {
    cleanup()
    sb.configured = false
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('stays on /login when only a stale local session exists', async () => {
    seedLocalSession()

    await act(async () => {
      renderLogin()
    })

    expect(screen.getByTestId('pathname').textContent).toBe('/login')
    // Proves the page really is in Supabase mode: magic link, no password field.
    expect(screen.getByRole('button', { name: 'Send magic link' })).toBeTruthy()
    expect(screen.queryByLabelText('Password')).toBeNull()
  })

  it('redirects a real Supabase session to the route it was sent from', async () => {
    seedLocalSession()
    sb.getSession.mockResolvedValue({ data: { session: fakeSession('cloud@itera.test') } })

    await act(async () => {
      renderLogin({ pathname: '/login', state: { from: '/review' } })
    })

    expect(screen.getByTestId('pathname').textContent).toBe('/review')
    expect(screen.getByText('Review')).toBeTruthy()
  })

  // A failed session bootstrap lands the visitor here, so this screen is the
  // only place that can say why. It reuses the panel's existing form-error
  // region rather than adding an error surface (audit 2026-08-22).
  it('shows why the visitor is signed out when the session bootstrap failed', async () => {
    sb.getSession.mockRejectedValue(new Error('network down'))

    await act(async () => {
      renderLogin()
    })

    expect(screen.getByTestId('pathname').textContent).toBe('/login')
    expect(screen.getByRole('alert').textContent).toBe(
      "Couldn't reach the account service. Check your connection and try again.",
    )
    // Still a usable login screen, not an error page.
    expect(screen.getByRole('button', { name: 'Send magic link' })).toBeTruthy()
  })

  it('shows no error at all on a healthy signed-out bootstrap', async () => {
    await act(async () => {
      renderLogin()
    })

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
