// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AuthProvider, useAuth } from './AuthProvider'
import { createWebAuthConfig } from './webAuthConfig'
import { isSupabaseConfigured } from '@/data/supabase/client'
import { readLocalSession } from './localSession'
import { RequireAuth } from './RequireAuth'

// The suite blanks VITE_SUPABASE_* (vitest.config.ts), so the Supabase half of the
// auth path is otherwise unreachable. Mocking the config seam is the only way to
// exercise it, and `isSupabaseConfigured` is a getter so a single file can render
// both modes: renderApp builds the AuthConfig at render time, exactly as
// src/main.tsx builds it at boot, so flipping the flag flips the mode.
const sb = vi.hoisted(() => {
  const listeners: ((event: string, session: unknown) => void)[] = []
  return {
    configured: false,
    listeners,
    getSession: vi.fn(async () => ({ data: { session: null as Session | null } })),
    signOut: vi.fn(async () => {
      listeners.forEach((cb) => cb('SIGNED_OUT', null))
      return { error: null }
    }),
  }
})

vi.mock('@/data/supabase/client', () => ({
  get isSupabaseConfigured() {
    return sb.configured
  },
  getSupabase: () => ({
    auth: {
      getSession: () => sb.getSession(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        sb.listeners.push(cb)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const i = sb.listeners.indexOf(cb)
                if (i >= 0) sb.listeners.splice(i, 1)
              },
            },
          },
        }
      },
      signOut: () => sb.signOut(),
    },
  }),
}))

function fakeSession(email: string): Session {
  return { access_token: 't', user: { id: 'u1', email } } as unknown as Session
}

function seedLocalSession(email = 'stale@local.test') {
  window.localStorage.setItem(
    'itera.session',
    JSON.stringify({ id: 'x', email, kind: 'local', createdAt: '' }),
  )
}

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
  const { signInDemo, isAuthenticated, sessionError } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  if (isAuthenticated) return <Navigate to={from && from !== '/login' ? from : '/'} replace />

  return (
    <>
      <div>Login</div>
      <div data-testid="session-error">{sessionError ?? ''}</div>
      <button type="button" onClick={signInDemo}>
        demo
      </button>
    </>
  )
}

function renderApp(initial: string) {
  return render(
    <AuthProvider config={createWebAuthConfig(isSupabaseConfigured)}>
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
  const { signOut, identity } = useAuth()
  return (
    <>
      <div>Today</div>
      <div data-testid="identity">
        {identity ? `${identity.kind}:${identity.email}` : 'none'}
      </div>
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

  // Local mode never touches the Supabase bootstrap, so the getSession failure
  // handling added for the audit cannot have changed anything here.
  it('never consults the Supabase session bootstrap', () => {
    sb.getSession.mockClear()
    renderApp('/')

    expect(screen.getByText('Login')).toBeTruthy()
    expect(sb.getSession).not.toHaveBeenCalled()
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

// Audit P1-3: with Supabase configured the repository is SupabaseRepository, so a
// leftover `itera.session` from a previous local-first build must not authenticate.
describe('RequireAuth - Supabase mode', () => {
  beforeEach(() => {
    sb.configured = true
    sb.listeners.length = 0
    sb.getSession.mockClear()
    sb.getSession.mockResolvedValue({ data: { session: null } })
    sb.signOut.mockClear()
  })

  afterEach(() => {
    cleanup()
    sb.configured = false
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('does not let a stale local session in, and clears it', async () => {
    seedLocalSession()

    await act(async () => {
      renderApp('/review')
    })

    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.getByText('Login')).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toBe('/login from=/review')
    // Cleared through the localSession seam, not by touching the key here.
    expect(readLocalSession()).toBeNull()
  })

  it('leaves the learner IndexedDB workspace alone while clearing the session', async () => {
    seedLocalSession()
    window.localStorage.setItem('itera.unrelated', 'keep me')

    await act(async () => {
      renderApp('/')
    })

    expect(readLocalSession()).toBeNull()
    expect(window.localStorage.getItem('itera.unrelated')).toBe('keep me')
  })

  it('authenticates a real Supabase session, and its identity wins over a stale local one', async () => {
    seedLocalSession('stale@local.test')
    sb.getSession.mockResolvedValue({ data: { session: fakeSession('cloud@itera.test') } })

    await act(async () => {
      renderApp('/')
    })

    expect(screen.getByText('Today')).toBeTruthy()
    expect(screen.getByTestId('identity').textContent).toBe('supabase:cloud@itera.test')
  })

  it('never renders authenticated while the Supabase bootstrap is still pending', async () => {
    seedLocalSession()
    let settle: (v: { data: { session: Session | null } }) => void = () => {}
    sb.getSession.mockReturnValue(
      new Promise<{ data: { session: Session | null } }>((resolve) => {
        settle = resolve
      }),
    )

    renderApp('/')

    // loading is still true: RequireAuth renders nothing rather than flashing the app.
    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.queryByText('Login')).toBeNull()

    await act(async () => {
      settle({ data: { session: null } })
    })

    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.getByText('Login')).toBeTruthy()
  })

  // The bootstrap must always end in a decided state. A bare `.then` meant a
  // rejected getSession() never cleared `loading`, so AuthGate showed "Loading…"
  // forever - the one path to a permanently blank app (audit 2026-08-22).
  it('ends loading and signs the visitor out when getSession() rejects', async () => {
    sb.getSession.mockRejectedValue(new Error('network down'))

    await act(async () => {
      renderApp('/review')
    })

    expect(screen.getByText('Login')).toBeTruthy()
    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.getByTestId('pathname').textContent).toBe('/login from=/review')
  })

  it('explains a rejected bootstrap rather than silently signing the visitor out', async () => {
    sb.getSession.mockRejectedValue(new Error('network down'))

    await act(async () => {
      renderApp('/')
    })

    expect(screen.getByTestId('session-error').textContent).toBe(
      "Couldn't reach the account service. Check your connection and try again.",
    )
  })

  it('treats a getSession() that resolves with an error the same as a rejection', async () => {
    sb.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid Refresh Token' },
    })

    await act(async () => {
      renderApp('/')
    })

    expect(screen.getByText('Login')).toBeTruthy()
    expect(screen.getByTestId('session-error').textContent).toContain("Couldn't reach the account service")
  })

  it('does not admit a stale local session when the bootstrap rejects', async () => {
    seedLocalSession()
    sb.getSession.mockRejectedValue(new Error('network down'))

    await act(async () => {
      renderApp('/')
    })

    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.getByText('Login')).toBeTruthy()
    expect(readLocalSession()).toBeNull()
  })

  it('clears the bootstrap error when a session arrives on the auth-state channel', async () => {
    sb.getSession.mockRejectedValue(new Error('network down'))

    await act(async () => {
      renderApp('/')
    })
    expect(screen.getByTestId('session-error').textContent).toContain("Couldn't reach")

    await act(async () => {
      sb.listeners.forEach((cb) => cb('SIGNED_IN', fakeSession('cloud@itera.test')))
    })

    expect(screen.getByText('Today')).toBeTruthy()
  })

  it('does not update state after unmount when the bootstrap settles late', async () => {
    let settle: (v: { data: { session: Session | null } }) => void = () => {}
    let fail: (e: unknown) => void = () => {}
    sb.getSession.mockReturnValue(
      new Promise<{ data: { session: Session | null } }>((resolve, reject) => {
        settle = resolve
        fail = reject
      }),
    )

    const { unmount } = renderApp('/')
    unmount()

    // Both outcomes, after the provider is gone. React would warn (and a
    // future StrictMode double-mount would misbehave) if either were applied.
    await act(async () => {
      settle({ data: { session: fakeSession('cloud@itera.test') } })
      fail(new Error('too late'))
      await Promise.resolve()
    })

    expect(screen.queryByText('Today')).toBeNull()
  })

  it('signs out through Supabase, and no stale local session re-admits the user', async () => {
    const user = userEvent.setup()
    seedLocalSession()
    sb.getSession.mockResolvedValue({ data: { session: fakeSession('cloud@itera.test') } })

    await act(async () => {
      renderApp('/')
    })
    expect(screen.getByText('Today')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'sign out' }))

    expect(sb.signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Login')).toBeTruthy()
    expect(readLocalSession()).toBeNull()
  })
})
