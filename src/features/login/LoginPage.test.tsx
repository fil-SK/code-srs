// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { readLocalSession } from '@/auth/localSession'
import { LoginPage } from './LoginPage'

function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

function renderLogin(initial = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <LocationProbe />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Today</div>} />
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
