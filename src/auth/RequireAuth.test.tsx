// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthProvider'
import { RequireAuth } from './RequireAuth'

function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="pathname">
      {location.pathname}
      {(location.state as { from?: string } | null)?.from
        ? ` from=${(location.state as { from?: string }).from}`
        : ''}
    </div>
  )
}

// Stands in for the real /login route, minus the visual page — including its
// redirect-when-already-authenticated behavior, which is what carries a
// just-signed-in visitor into the app.
function LoginStub() {
  const { signInDemo, isAuthenticated } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  if (isAuthenticated) return <Navigate to={from && from !== '/login' ? from : '/'} replace />

  return (
    <>
      <div>Login</div>
      <button type="button" onClick={signInDemo}>
        demo
      </button>
    </>
  )
}

function renderApp(initial: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <LocationProbe />
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Protected />} />
            <Route path="/review" element={<div>Review</div>} />
          </Route>
          <Route path="/login" element={<LoginStub />} />
          <Route path="/design-preview" element={<div>Design preview</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function Protected() {
  const { signOut } = useAuth()
  return (
    <>
      <div>Today</div>
      <button type="button" onClick={() => void signOut()}>
        sign out
      </button>
    </>
  )
}

describe('RequireAuth', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('sends a signed-out visitor to /login, remembering where they were headed', () => {
    renderApp('/review')

    expect(screen.getByText('Login')).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toBe('/login from=/review')
  })

  it('lets a signed-in visitor through', () => {
    window.sessionStorage.setItem(
      'itera.session',
      JSON.stringify({ id: 'x', email: 'a@b.com', kind: 'local', createdAt: '' }),
    )
    renderApp('/')

    expect(screen.getByText('Today')).toBeTruthy()
  })

  it('leaves /design-preview reachable while signed out', () => {
    renderApp('/design-preview')
    expect(screen.getByText('Design preview')).toBeTruthy()
  })

  it('closes the loop: sign in reaches the app, sign out returns to /login', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByText('Login')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'demo' }))
    expect(screen.getByText('Today')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'sign out' }))
    expect(screen.getByText('Login')).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toContain('/login')
  })
})
