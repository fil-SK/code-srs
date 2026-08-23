import { describe, expect, it } from 'vitest'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { BOOTSTRAP_ERROR, createAuthEngine } from './authEngine'
import { createLocalSession } from './localSession'
import type { LocalSession, LocalSessionStore } from './types'

// The lifecycle net for the shared auth engine. It runs in core's own test
// project: node, no DOM, no renderer, no setup file. That is the point of the
// engine being framework-neutral - a bootstrap that must always end and a
// subscription that must be torn down are provable without mounting anything.

type AuthListener = (event: string, session: Session | null) => void
type SessionResult = { data: { session: Session | null }; error: unknown }

function session(email: string | undefined = 'cloud@itera.test'): Session {
  return { access_token: 't', user: { id: 'u1', email } } as unknown as Session
}

function memoryStore(initial: LocalSession | null = null) {
  const record = {
    value: initial,
    writes: [] as { session: LocalSession; remember: boolean }[],
    clears: 0,
  }
  const store: LocalSessionStore = {
    read: () => record.value,
    write: (next, { remember }) => {
      record.value = next
      record.writes.push({ session: next, remember })
    },
    clear: () => {
      record.value = null
      record.clears += 1
    },
  }
  return { store, record }
}

function fakeSupabase() {
  const listeners: AuthListener[] = []
  const calls = { getSession: 0, signOut: 0, unsubscribes: 0 }
  let settled: SessionResult = { data: { session: null }, error: null }
  let rejection: unknown = null
  let pending: Promise<SessionResult> | null = null

  const client = {
    auth: {
      getSession: () => {
        calls.getSession += 1
        if (pending) return pending
        if (rejection) return Promise.reject(rejection)
        return Promise.resolve(settled)
      },
      onAuthStateChange: (cb: AuthListener) => {
        listeners.push(cb)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                calls.unsubscribes += 1
                const i = listeners.indexOf(cb)
                if (i >= 0) listeners.splice(i, 1)
              },
            },
          },
        }
      },
      signOut: async () => {
        calls.signOut += 1
        return { error: null }
      },
    },
  }

  return {
    client: client as unknown as SupabaseClient,
    calls,
    listeners,
    resolvesWith(value: { data: { session: Session | null }; error?: unknown }) {
      settled = { data: value.data, error: value.error ?? null }
    },
    rejectsWith(err: unknown) {
      rejection = err
    },
    /** Hold the bootstrap open, so "pending" and "settles too late" are testable. */
    stayPending() {
      let settle!: (v: SessionResult) => void
      let fail!: (e: unknown) => void
      pending = new Promise<SessionResult>((res, rej) => {
        settle = res
        fail = rej
      })
      return { settle, fail }
    },
    emit(event: string, next: Session | null) {
      listeners.forEach((cb) => cb(event, next))
    },
  }
}

// One turn of the microtask queue is not enough: the bootstrap chains
// then/catch/finally, and each link is its own tick.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createAuthEngine - local mode', () => {
  it('starts signed out with nothing stored, and never reaches for a client', () => {
    const { store } = memoryStore()
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    expect(engine.getSnapshot()).toMatchObject({
      mode: 'local',
      loading: false,
      isAuthenticated: false,
      identity: null,
      session: null,
      sessionError: null,
    })
    // start() is a no-op here; there is nothing asynchronous to wait for.
    expect(engine.start()).toBeInstanceOf(Function)
  })

  it('adopts a stored session on the very first snapshot', () => {
    const stored = createLocalSession('someone@local.test')
    const { store } = memoryStore(stored)
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    expect(engine.getSnapshot()).toMatchObject({
      isAuthenticated: true,
      identity: { email: 'someone@local.test', kind: 'local' },
    })
  })

  it('writes a remembered sign-in through the injected store', () => {
    const { store, record } = memoryStore()
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    engine.signInLocal('someone@local.test', { remember: true })

    expect(record.writes).toHaveLength(1)
    expect(record.writes[0].remember).toBe(true)
    expect(record.writes[0].session).toMatchObject({
      email: 'someone@local.test',
      kind: 'local',
    })
    expect(engine.getSnapshot().isAuthenticated).toBe(true)
  })

  it('carries a non-remembered sign-in through as remember: false', () => {
    const { store, record } = memoryStore()
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    engine.signInLocal('someone@local.test', { remember: false })

    expect(record.writes[0].remember).toBe(false)
  })

  // A look-around identity, not an account someone means to keep.
  it('signs the demo workspace in unremembered, under its own kind', () => {
    const { store, record } = memoryStore()
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    engine.signInDemo()

    expect(record.writes[0].remember).toBe(false)
    expect(engine.getSnapshot().identity).toEqual({
      email: 'demo@itera.local',
      kind: 'demo',
    })
  })

  it('signs out by clearing the store and the state', async () => {
    const { store, record } = memoryStore(createLocalSession('someone@local.test'))
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    await engine.signOut()

    expect(record.clears).toBeGreaterThan(0)
    expect(record.value).toBeNull()
    expect(engine.getSnapshot()).toMatchObject({ isAuthenticated: false, identity: null })
  })

  it('notifies subscribers while they are subscribed, and not after', () => {
    const { store } = memoryStore()
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })
    let notified = 0
    const unsubscribe = engine.subscribe(() => {
      notified += 1
    })

    engine.signInLocal('someone@local.test', { remember: false })
    expect(notified).toBe(1)

    unsubscribe()
    engine.signInDemo()
    expect(notified).toBe(1)
  })

  // useSyncExternalStore bails out on Object.is, so an unstable snapshot would
  // re-render the whole app on every parent render.
  it('returns a stable snapshot while nothing changes', () => {
    const { store } = memoryStore()
    const engine = createAuthEngine({ mode: 'local', localSessionStore: store })

    expect(engine.getSnapshot()).toBe(engine.getSnapshot())

    const before = engine.getSnapshot()
    engine.signInLocal('someone@local.test', { remember: false })
    expect(engine.getSnapshot()).not.toBe(before)
  })
})

describe('createAuthEngine - Supabase mode', () => {
  function setup(stored: LocalSession | null = null) {
    const { store, record } = memoryStore(stored)
    const sb = fakeSupabase()
    const engine = createAuthEngine({
      mode: 'supabase',
      localSessionStore: store,
      getSupabaseClient: () => sb.client,
    })
    return { engine, sb, record }
  }

  it('is loading before the bootstrap lands, and admits no one', () => {
    const { engine, sb } = setup()
    sb.stayPending()
    engine.start()

    expect(engine.getSnapshot()).toMatchObject({
      mode: 'supabase',
      loading: true,
      isAuthenticated: false,
      sessionError: null,
    })
  })

  it('authenticates a session the bootstrap returns', async () => {
    const { engine, sb } = setup()
    sb.resolvesWith({ data: { session: session() } })
    engine.start()
    await flush()

    expect(engine.getSnapshot()).toMatchObject({
      loading: false,
      isAuthenticated: true,
      identity: { email: 'cloud@itera.test', kind: 'supabase' },
      sessionError: null,
    })
  })

  it('ends signed out when the bootstrap returns no session', async () => {
    const { engine, sb } = setup()
    sb.resolvesWith({ data: { session: null } })
    engine.start()
    await flush()

    expect(engine.getSnapshot()).toMatchObject({
      loading: false,
      isAuthenticated: false,
      sessionError: null,
    })
  })

  // The permanently-blank-screen path: loading has to clear on every outcome.
  it('ends loading with an explanation when the bootstrap rejects', async () => {
    const { engine, sb } = setup()
    sb.rejectsWith(new TypeError('Failed to fetch'))
    engine.start()
    await flush()

    expect(engine.getSnapshot()).toMatchObject({
      loading: false,
      isAuthenticated: false,
      sessionError: BOOTSTRAP_ERROR,
    })
  })

  // GoTrue returns some failures and throws others; they are the same event to
  // the visitor, so they must read identically.
  it('treats a resolved error exactly like a rejection', async () => {
    const { engine, sb } = setup()
    sb.resolvesWith({ data: { session: null }, error: { message: 'invalid refresh token' } })
    engine.start()
    await flush()

    expect(engine.getSnapshot()).toMatchObject({
      loading: false,
      isAuthenticated: false,
      sessionError: BOOTSTRAP_ERROR,
    })
  })

  it('never surfaces the raw transport message', async () => {
    const { engine, sb } = setup()
    sb.rejectsWith(new TypeError('Failed to fetch'))
    engine.start()
    await flush()

    expect(engine.getSnapshot().sessionError).not.toMatch(/fetch/i)
  })

  // Audit P1-3. The stale record is cleared, not honoured - and only the record:
  // the learner's local workspace is not this layer's to touch.
  it('clears a stale local record at start, and never adopts it', async () => {
    const { engine, sb, record } = setup(createLocalSession('stale@local.test'))

    expect(engine.getSnapshot().isAuthenticated).toBe(false)

    engine.start()
    expect(record.clears).toBe(1)
    expect(record.value).toBeNull()

    sb.resolvesWith({ data: { session: null } })
    await flush()
    expect(engine.getSnapshot()).toMatchObject({ isAuthenticated: false, identity: null })
  })

  it('does not admit a stale local record even when the bootstrap fails', async () => {
    const { engine, sb } = setup(createLocalSession('stale@local.test'))
    sb.rejectsWith(new Error('offline'))
    engine.start()
    await flush()

    expect(engine.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      identity: null,
      sessionError: BOOTSTRAP_ERROR,
    })
  })

  it('lets a real Supabase session outrank a stale local record', async () => {
    const { engine, sb } = setup(createLocalSession('stale@local.test'))
    sb.resolvesWith({ data: { session: session() } })
    engine.start()
    await flush()

    expect(engine.getSnapshot().identity).toEqual({
      email: 'cloud@itera.test',
      kind: 'supabase',
    })
  })

  it('refuses to mint a local or demo session at all', () => {
    const { engine, record } = setup()
    engine.start()

    engine.signInLocal('someone@local.test', { remember: true })
    engine.signInDemo()

    expect(record.writes).toEqual([])
    expect(engine.getSnapshot().isAuthenticated).toBe(false)
  })

  it('takes a session that arrives later on the auth-state channel', async () => {
    const { engine, sb } = setup()
    sb.rejectsWith(new Error('offline'))
    engine.start()
    await flush()
    expect(engine.getSnapshot().sessionError).toBe(BOOTSTRAP_ERROR)

    sb.emit('SIGNED_IN', session())

    expect(engine.getSnapshot()).toMatchObject({
      isAuthenticated: true,
      identity: { email: 'cloud@itera.test', kind: 'supabase' },
      sessionError: null,
    })
  })

  it('signs out through the client and leaves no local record behind', async () => {
    const { engine, sb, record } = setup()
    sb.resolvesWith({ data: { session: session() } })
    engine.start()
    await flush()

    await engine.signOut()
    sb.emit('SIGNED_OUT', null)

    expect(sb.calls.signOut).toBe(1)
    expect(record.value).toBeNull()
    expect(engine.getSnapshot().isAuthenticated).toBe(false)
  })

  // Signing out of the cloud must not fall back to whatever local storage holds.
  it('cannot be re-admitted by a local record written behind its back', async () => {
    const { engine, sb, record } = setup()
    sb.resolvesWith({ data: { session: session() } })
    engine.start()
    await flush()

    record.value = createLocalSession('stale@local.test')
    await engine.signOut()
    sb.emit('SIGNED_OUT', null)

    expect(engine.getSnapshot()).toMatchObject({ isAuthenticated: false, identity: null })
  })
})

describe('createAuthEngine - lifecycle', () => {
  function setup() {
    const { store } = memoryStore()
    const sb = fakeSupabase()
    const engine = createAuthEngine({
      mode: 'supabase',
      localSessionStore: store,
      getSupabaseClient: () => sb.client,
    })
    return { engine, sb }
  }

  it('applies nothing from a bootstrap that settles after teardown', async () => {
    const { engine, sb } = setup()
    const deferred = sb.stayPending()
    const dispose = engine.start()

    dispose()
    deferred.settle({ data: { session: session() }, error: null })
    await flush()

    expect(engine.getSnapshot()).toMatchObject({ loading: true, isAuthenticated: false })
  })

  it('applies nothing from a bootstrap that rejects after teardown', async () => {
    const { engine, sb } = setup()
    const deferred = sb.stayPending()
    const dispose = engine.start()

    dispose()
    deferred.fail(new Error('offline'))
    await flush()

    expect(engine.getSnapshot()).toMatchObject({ loading: true, sessionError: null })
  })

  it('unsubscribes from the auth-state channel on teardown', () => {
    const { engine, sb } = setup()
    const dispose = engine.start()
    expect(sb.listeners).toHaveLength(1)

    dispose()

    expect(sb.calls.unsubscribes).toBe(1)
    expect(sb.listeners).toHaveLength(0)
  })

  // What React StrictMode does on every mount in development.
  it('survives start - teardown - start', async () => {
    const { engine, sb } = setup()
    sb.resolvesWith({ data: { session: session() } })

    engine.start()()
    engine.start()
    await flush()

    expect(sb.listeners).toHaveLength(1)
    expect(engine.getSnapshot().isAuthenticated).toBe(true)
  })
})
