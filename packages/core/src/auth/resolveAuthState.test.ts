import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { resolveAuthState } from './resolveAuthState'
import type { LocalSession } from './types'

// Audit P1-3, pinned. Every case here is a way the two auth models could be
// allowed to substitute for each other, which is the bug.

const localSession: LocalSession = {
  id: 'l1',
  email: 'someone@local.test',
  kind: 'local',
  createdAt: '2026-08-01T00:00:00.000Z',
}

const demoSession: LocalSession = { ...localSession, id: 'l2', kind: 'demo', email: 'demo@itera.local' }

function supabaseSession(email: string | undefined): Session {
  return { access_token: 't', user: { id: 'u1', email } } as unknown as Session
}

describe('resolveAuthState - local mode', () => {
  it('is signed out with no local session', () => {
    expect(resolveAuthState({ mode: 'local', supabaseSession: null, localSession: null })).toEqual({
      identity: null,
      isAuthenticated: false,
    })
  })

  it('authenticates a local session and reports its kind', () => {
    expect(
      resolveAuthState({ mode: 'local', supabaseSession: null, localSession }),
    ).toEqual({
      identity: { email: 'someone@local.test', kind: 'local' },
      isAuthenticated: true,
    })
  })

  it('authenticates the demo workspace as its own kind', () => {
    expect(
      resolveAuthState({ mode: 'local', supabaseSession: null, localSession: demoSession }),
    ).toEqual({ identity: { email: 'demo@itera.local', kind: 'demo' }, isAuthenticated: true })
  })

  it('does not let a Supabase session substitute for a local one', () => {
    expect(
      resolveAuthState({
        mode: 'local',
        supabaseSession: supabaseSession('cloud@itera.test'),
        localSession: null,
      }),
    ).toEqual({ identity: null, isAuthenticated: false })
  })
})

describe('resolveAuthState - Supabase mode', () => {
  it('is signed out with no Supabase session', () => {
    expect(
      resolveAuthState({ mode: 'supabase', supabaseSession: null, localSession: null }),
    ).toEqual({ identity: null, isAuthenticated: false })
  })

  it('authenticates a Supabase session', () => {
    expect(
      resolveAuthState({
        mode: 'supabase',
        supabaseSession: supabaseSession('cloud@itera.test'),
        localSession: null,
      }),
    ).toEqual({ identity: { email: 'cloud@itera.test', kind: 'supabase' }, isAuthenticated: true })
  })

  // The finding itself: a leftover record from a local-first build must not be
  // an admission ticket to a cloud-backed app that has no user for it.
  it('never authenticates on a stale local session', () => {
    expect(
      resolveAuthState({ mode: 'supabase', supabaseSession: null, localSession }),
    ).toEqual({ identity: null, isAuthenticated: false })
  })

  it('never authenticates on a stale demo session either', () => {
    expect(
      resolveAuthState({ mode: 'supabase', supabaseSession: null, localSession: demoSession }),
    ).toEqual({ identity: null, isAuthenticated: false })
  })

  it('shows the Supabase identity when a stale local record is also present', () => {
    expect(
      resolveAuthState({
        mode: 'supabase',
        supabaseSession: supabaseSession('cloud@itera.test'),
        localSession,
      }),
    ).toEqual({ identity: { email: 'cloud@itera.test', kind: 'supabase' }, isAuthenticated: true })
  })

  // Preserved as it shipped, deliberately: a session with no email is a real
  // session, and the account menu simply has nothing to show for it.
  it('authenticates a session with no user email but reports no identity', () => {
    expect(
      resolveAuthState({
        mode: 'supabase',
        supabaseSession: supabaseSession(undefined),
        localSession: null,
      }),
    ).toEqual({ identity: null, isAuthenticated: true })
  })
})
