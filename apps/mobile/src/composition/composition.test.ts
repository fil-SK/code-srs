import { type AuthConfig, getRepository, resolveAuthState, SupabaseRepository } from '@itera/core'
import type { SupabaseClient } from '@supabase/supabase-js'

import { inertLocalSessionStore } from '@/src/auth/mobileAuthConfig'
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
  // The mode is resolved once when src/config/mobileRuntimeMode.ts is first
  // evaluated, so each case re-imports the module graph under a different
  // environment rather than trying to mutate a resolved constant.
  function configForMode(mode: string | undefined) {
    const previous = process.env.EXPO_PUBLIC_ITERA_MODE
    if (mode === undefined) delete process.env.EXPO_PUBLIC_ITERA_MODE
    else process.env.EXPO_PUBLIC_ITERA_MODE = mode

    let config: AuthConfig | undefined
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      config = require('@/src/auth/mobileAuthConfig').createMobileAuthConfig()
    })

    if (previous === undefined) delete process.env.EXPO_PUBLIC_ITERA_MODE
    else process.env.EXPO_PUBLIC_ITERA_MODE = previous

    if (!config) throw new Error('unreachable')
    return config
  }

  it('is Supabase mode in cloud mode, so backend and auth cannot disagree', () => {
    expect(configForMode('cloud').mode).toBe('supabase')
  })

  it('supplies a getter rather than a constructed client', () => {
    const config = configForMode('cloud')
    expect(config.mode).toBe('supabase')
    if (config.mode !== 'supabase') throw new Error('unreachable')
    expect(typeof config.getSupabaseClient).toBe('function')
  })

  it('stores no local session record in cloud mode, so there is no second way to be signed in', () => {
    inertLocalSessionStore.write(
      { id: 'x', email: 'someone@example.com', kind: 'local', createdAt: '2026-01-01' },
      { remember: true },
    )
    expect(inertLocalSessionStore.read()).toBeNull()

    inertLocalSessionStore.clear()
    expect(inertLocalSessionStore.read()).toBeNull()
  })

  it('defaults to demo mode, which is core local mode and needs no Supabase client', () => {
    const config = configForMode(undefined)
    expect(config.mode).toBe('local')
    expect(config).not.toHaveProperty('getSupabaseClient')
  })

  it('treats any unrecognised mode value as demo rather than guessing cloud', () => {
    expect(configForMode('production').mode).toBe('local')
  })

  it('hands core a pre-seeded demo session, so demo mode opens the app with no sign-in', () => {
    // Core reads the store while the engine is constructed and leaves `loading`
    // false in local mode, so a record here means the very first rendered frame
    // is already authenticated. No OTP, no bootstrap, no cloud request.
    const config = configForMode('demo')
    const session = config.localSessionStore.read()

    expect(session).not.toBeNull()
    expect(session?.kind).toBe('demo')
    expect(resolveAuthState({
      mode: config.mode,
      supabaseSession: null,
      localSession: session,
    }).isAuthenticated).toBe(true)
  })

  it('never reaches the Supabase client in demo mode', () => {
    jest.mocked(getMobileSupabase).mockClear()
    configForMode('demo')
    expect(getMobileSupabase).not.toHaveBeenCalled()
  })

  it('refuses to remember anything, because demo state is not persistence', () => {
    const config = configForMode('demo')
    config.localSessionStore.write(
      { id: 'other', email: 'someone@example.com', kind: 'local', createdAt: '2026-01-01' },
      { remember: true },
    )
    expect(config.localSessionStore.read()?.email).toBe('demo@itera.app')

    config.localSessionStore.clear()
    expect(config.localSessionStore.read()).not.toBeNull()
  })
})
