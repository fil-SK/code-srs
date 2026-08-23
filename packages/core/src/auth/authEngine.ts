import type { Session } from '@supabase/supabase-js'
import { resolveAuthState } from './resolveAuthState'
import { createLocalSession, DEMO_EMAIL } from './localSession'
import type { AuthConfig, AuthSnapshot, LocalSession } from './types'

// The authentication state machine, with every platform dependency injected.
//
// It is deliberately not a React component. The behaviour worth protecting here
// is a lifecycle - a bootstrap that must always end, a subscription that must be
// torn down, a late result that must not apply after cancellation - and keeping
// it framework-neutral is what lets it be tested directly, in core's own test
// project, with no DOM and no renderer. The React binding over it is thin enough
// to be obvious by reading (see AuthProvider.ts).

// Deliberately not the raw Supabase/transport message: this is the very first
// thing a visitor can see, and "TypeError: Failed to fetch" tells them nothing
// they can act on.
export const BOOTSTRAP_ERROR =
  "Couldn't reach the account service. Check your connection and try again."

export interface AuthEngine {
  /**
   * The current state. Referentially stable between real changes, because
   * useSyncExternalStore bails out on Object.is and would otherwise re-render
   * on every parent render.
   */
  getSnapshot: () => AuthSnapshot
  subscribe: (listener: () => void) => () => void
  /**
   * Begin the Supabase bootstrap and the auth-state subscription. Returns the
   * teardown. A no-op in local mode, where there is nothing asynchronous to
   * wait for. Safe to call again after teardown, which is what React
   * StrictMode's double-invoke does.
   */
  start: () => () => void
  signInLocal: (email: string, opts: { remember: boolean }) => void
  signInDemo: () => void
  signOut: () => Promise<void>
}

export function createAuthEngine(config: AuthConfig): AuthEngine {
  const store = config.localSessionStore
  const mode = config.mode

  let session: Session | null = null
  let loading = mode === 'supabase'
  let sessionError: string | null = null
  // Not even read in Supabase mode, so there is no first-render window where a
  // stale local record renders the app authenticated before the bootstrap lands.
  // Discounting it later would have been a frame too late.
  let local: LocalSession | null = mode === 'supabase' ? null : store.read()

  const listeners = new Set<() => void>()

  function compose(): AuthSnapshot {
    const { identity, isAuthenticated } = resolveAuthState({
      mode,
      supabaseSession: session,
      localSession: local,
    })
    return { mode, session, loading, sessionError, identity, isAuthenticated }
  }

  let snapshot = compose()

  function emit(): void {
    snapshot = compose()
    for (const listener of [...listeners]) listener()
  }

  function start(): () => void {
    if (config.mode !== 'supabase') return () => {}

    // Supabase owns authentication here, so a leftover local/demo record is dead
    // weight. This is session cleanup only: the learner's local workspace is
    // left untouched, and is never silently uploaded or deleted.
    store.clear()

    const sb = config.getSupabaseClient()
    let cancelled = false

    // The bootstrap has to end in a decided state, always. A bare `.then` left
    // `loading` true forever when getSession() rejected, which was the one path
    // in the app to a permanently blank screen. All four outcomes are handled: a
    // session, no session, a resolved error, and a rejection. The last two are
    // the same event to the visitor - some failures GoTrue returns, others it
    // throws - so they read identically: signed out, and here is why. No session
    // is ever invented on failure.
    sb.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          sessionError = BOOTSTRAP_ERROR
          emit()
          return
        }
        session = data.session
        emit()
      })
      .catch(() => {
        if (cancelled) return
        sessionError = BOOTSTRAP_ERROR
        emit()
      })
      .finally(() => {
        if (cancelled) return
        loading = false
        emit()
      })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      session = next
      // A session arriving later (magic-link return, refresh) resolves whatever
      // the bootstrap could not reach.
      if (next) sessionError = null
      emit()
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }

  // Both local sign-ins are no-ops in Supabase mode. The web sign-in screen
  // already never calls them there; this stops any future caller, on any
  // platform, minting a record that could never authenticate.
  function signInLocal(email: string, { remember }: { remember: boolean }): void {
    if (mode === 'supabase') return
    const next = createLocalSession(email, 'local')
    store.write(next, { remember })
    local = next
    emit()
  }

  // The demo workspace is deliberately not remembered across browser restarts:
  // it is a look-around identity, not an account someone means to keep.
  function signInDemo(): void {
    if (mode === 'supabase') return
    const next = createLocalSession(DEMO_EMAIL, 'demo')
    store.write(next, { remember: false })
    local = next
    emit()
  }

  // Clearing the local record unconditionally, in both modes, is defensive and
  // costs nothing. Making it conditional is exactly how the leftover this whole
  // module guards against gets left behind again.
  async function signOut(): Promise<void> {
    store.clear()
    if (local !== null) {
      local = null
      emit()
    }
    if (config.mode === 'supabase') await config.getSupabaseClient().auth.signOut()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    start,
    signInLocal,
    signInDemo,
    signOut,
  }
}
