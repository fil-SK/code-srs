import type { Session, SupabaseClient } from '@supabase/supabase-js'

// The shared authentication contracts. Everything here is platform-neutral by
// construction: no storage technology, no environment variable, no navigation.
//
// The one decision the shared layer does not make is which mode applies. Core is
// handed a decided `AuthMode`; translating platform configuration into it (the
// web app's VITE_SUPABASE_* read, a native app's EXPO_PUBLIC_* read) belongs to
// the composition root, because that is also where the Repository backend is
// chosen and the two must not be able to disagree (audit P1-3).

/**
 * Which authentication model is active. Exactly one is, and it is the one
 * matching the backend `getRepository()` selected.
 */
export type AuthMode = 'local' | 'supabase'

export interface AuthIdentity {
  email: string
  kind: 'supabase' | 'local' | 'demo'
}

export type LocalSessionKind = 'local' | 'demo'

/**
 * The local (non-Supabase) session record. A development/demo shell, not
 * authentication: no password is stored, verified or transmitted. It exists so
 * the product has a real session boundary while an install remains local-first
 * with no backend.
 */
export interface LocalSession {
  id: string
  email: string
  kind: LocalSessionKind
  createdAt: string
}

/**
 * Where the local session record lives, as seen by the shared auth layer: a
 * value in, a value out, and no idea what is underneath. Web implements it over
 * localStorage/sessionStorage; a native app would implement it over SecureStore.
 *
 * Synchronous on purpose. The current web semantics are synchronous, the first
 * auth snapshot is computed during render so there is no frame in which a stale
 * record could render the app authenticated, and native never reads it at all
 * (mode is always 'supabase' there, so it can supply a store that does nothing).
 *
 * This is the seam for auth session storage and nothing else. It is not a
 * general persistence framework, and no other kind of state belongs behind it.
 */
export interface LocalSessionStore {
  read(): LocalSession | null
  /** `remember: false` means the record should not survive a browser restart. */
  write(session: LocalSession, options: { remember: boolean }): void
  clear(): void
}

/**
 * What a platform supplies to the shared auth layer at composition time.
 *
 * A discriminated union rather than a bag of optionals, so "a Supabase client is
 * required in Supabase mode" and "there is no client to reach for in local mode"
 * are compiler errors instead of runtime branches. The client arrives as a
 * getter so core never triggers its construction before it is needed, and never
 * constructs one itself.
 */
export type AuthConfig =
  | { mode: 'local'; localSessionStore: LocalSessionStore }
  | {
      mode: 'supabase'
      localSessionStore: LocalSessionStore
      getSupabaseClient: () => SupabaseClient
    }

/** The engine's whole observable state, as one immutable value. */
export interface AuthSnapshot {
  mode: AuthMode
  /** The Supabase session, or null. Always null in local mode. */
  session: Session | null
  loading: boolean
  /**
   * Set only when the Supabase session bootstrap failed, so a sign-in screen can
   * say why the visitor is signed out. Null in local mode and on every healthy
   * path.
   */
  sessionError: string | null
  /** Whoever is signed in, from the active mode's store only. Null when signed out. */
  identity: AuthIdentity | null
  isAuthenticated: boolean
}

/** What `useAuth()` returns. The snapshot, plus the actions. */
export interface AuthValue extends AuthSnapshot {
  email: string | undefined
  signInLocal: (email: string, opts: { remember: boolean }) => void
  signInDemo: () => void
  signOut: () => Promise<void>
}
