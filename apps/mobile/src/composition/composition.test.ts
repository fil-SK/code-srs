import { getRepository, SupabaseRepository } from '@itera/core'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createMobileAuthConfig, inertLocalSessionStore } from '@/src/auth/mobileAuthConfig'
import { getMobileSupabase } from '@/src/data/supabaseClient'
import { composeMobileRepository } from './composition'

// The repository is never exercised here, only constructed, which is the point:
// composition is a wiring fact and should be provable without a network, a
// schema or a fake PostgREST.
jest.mock('@/src/data/supabaseClient', () => ({
  isMobileSupabaseConfigured: true,
  getMobileSupabase: jest.fn(() => ({}) as SupabaseClient),
}))

describe('mobile repository composition', () => {
  it('registers a Supabase backend that the shared registry resolves', () => {
    composeMobileRepository()

    const repo = getRepository()
    expect(repo).toBeInstanceOf(SupabaseRepository)
  })

  it('caches one instance, so screens and hooks share a backend', () => {
    composeMobileRepository()
    expect(getRepository()).toBe(getRepository())
  })

  it('does not build the backend at registration time', () => {
    jest.mocked(getMobileSupabase).mockClear()

    composeMobileRepository()

    // The registry constructs lazily: importing or calling the composition root
    // must not open a connection, or every test tree and every Metro bundle
    // would pay for one whether or not it queries.
    expect(getMobileSupabase).not.toHaveBeenCalled()

    getRepository()
    expect(getMobileSupabase).toHaveBeenCalledTimes(1)
  })
})

describe('mobile auth config', () => {
  it('is always Supabase mode, because mobile is cloud-only', () => {
    expect(createMobileAuthConfig().mode).toBe('supabase')
  })

  it('supplies a getter rather than a constructed client', () => {
    const config = createMobileAuthConfig()
    expect(config.mode).toBe('supabase')
    if (config.mode !== 'supabase') throw new Error('unreachable')
    expect(typeof config.getSupabaseClient).toBe('function')
  })

  it('stores no local session record, so there is no second way to be signed in', () => {
    inertLocalSessionStore.write(
      { id: 'x', email: 'someone@example.com', kind: 'local', createdAt: '2026-01-01' },
      { remember: true },
    )
    expect(inertLocalSessionStore.read()).toBeNull()

    inertLocalSessionStore.clear()
    expect(inertLocalSessionStore.read()).toBeNull()
  })
})
