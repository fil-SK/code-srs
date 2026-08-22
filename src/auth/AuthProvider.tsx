import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client'
import {
  clearLocalSession,
  createLocalSession,
  readLocalSession,
  writeLocalSession,
  DEMO_EMAIL,
  type LocalSession,
} from './localSession'

export interface AuthIdentity {
  email: string
  kind: 'supabase' | 'local' | 'demo'
}

interface AuthValue {
  /** The Supabase session, or null. Always null in local mode — see `isAuthenticated`. */
  session: Session | null
  loading: boolean
  email: string | undefined
  /** Whoever is signed in, from the active mode's store only. Null when signed out. */
  identity: AuthIdentity | null
  isAuthenticated: boolean
  /**
   * Set only when the Supabase session bootstrap failed, so Login can say why
   * the visitor is signed out. Null in local mode and on every healthy path.
   */
  sessionError: string | null
  signInLocal: (email: string, opts: { remember: boolean }) => void
  signInDemo: () => void
  signOut: () => Promise<void>
}

// Deliberately not the raw Supabase/transport message: this is the very first
// thing a visitor can see, and "TypeError: Failed to fetch" tells them nothing
// they can act on.
const BOOTSTRAP_ERROR = "Couldn't reach the account service. Check your connection and try again."

const AuthContext = createContext<AuthValue | null>(null)

// Tracks who is signed in. There are two auth models, and exactly one of them is
// active: the one matching the backend `getRepository()` selected.
//   - Supabase configured: the Supabase session is the only session. A leftover
//     local record from a previous local-first build never authenticates.
//   - Supabase not configured: a local session (src/auth/localSession.ts) is the
//     only session, and is how local-first mode has an account boundary at all.
// Letting either one count regardless of mode is what made a stale `itera.session`
// admit someone to a cloud-backed app with no cloud user (audit P1-3). Routing gates
// on `isAuthenticated` (src/auth/RequireAuth.tsx); nothing else inspects storage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [sessionError, setSessionError] = useState<string | null>(null)
  // Not even read in Supabase mode, so there is no first-render window where a
  // stale local record renders the app authenticated before the bootstrap lands.
  const [local, setLocal] = useState<LocalSession | null>(() =>
    isSupabaseConfigured ? null : readLocalSession(),
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return

    // Supabase owns authentication here, so a leftover local/demo record is dead
    // weight. This is session cleanup only: the learner's IndexedDB workspace is
    // left untouched, and is never silently uploaded or deleted.
    clearLocalSession()

    const sb = getSupabase()
    let cancelled = false

    // The bootstrap has to end in a decided state, always. Before the
    // 2026-08-22 audit this was a bare `.then`, so a rejected getSession()
    // never cleared `loading` and AuthGate showed "Loading…" forever - the one
    // path that could leave the whole app blank with no way out. A failure is
    // now simply "signed out, and here is why": no session is invented, and
    // RequireAuth sends the visitor to /login where the message renders.
    sb.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setSessionError(BOOTSTRAP_ERROR)
          return
        }
        setSession(data.session)
      })
      .catch(() => {
        if (cancelled) return
        setSessionError(BOOTSTRAP_ERROR)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // A session arriving later (magic-link return, refresh) resolves whatever
      // the bootstrap could not reach.
      if (next) setSessionError(null)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Both local sign-ins are no-ops in Supabase mode. SignInPanel already never
  // calls them there (it sends a magic link and hides the demo divider); this stops
  // any future caller minting a record that could never authenticate.
  const signInLocal = useCallback(
    (email: string, { remember }: { remember: boolean }) => {
      if (isSupabaseConfigured) return
      const next = createLocalSession(email, 'local')
      writeLocalSession(next, { remember })
      setLocal(next)
    },
    [],
  )

  // The demo workspace is deliberately not remembered across browser restarts:
  // it is a look-around identity, not an account someone means to keep.
  const signInDemo = useCallback(() => {
    if (isSupabaseConfigured) return
    const next = createLocalSession(DEMO_EMAIL, 'demo')
    writeLocalSession(next, { remember: false })
    setLocal(next)
  }, [])

  const signOut = useCallback(async () => {
    clearLocalSession()
    setLocal(null)
    if (isSupabaseConfigured) await getSupabase().auth.signOut()
  }, [])

  const value = useMemo<AuthValue>(() => {
    // The active backend decides which session is a session. A stale record from
    // the inactive mode is neither an identity nor an admission ticket.
    const identity: AuthIdentity | null = isSupabaseConfigured
      ? session?.user.email
        ? { email: session.user.email, kind: 'supabase' }
        : null
      : local
        ? { email: local.email, kind: local.kind }
        : null

    return {
      session,
      loading,
      email: identity?.email,
      identity,
      isAuthenticated: isSupabaseConfigured ? session !== null : local !== null,
      sessionError,
      signInLocal,
      signInDemo,
      signOut,
    }
  }, [session, loading, sessionError, local, signInLocal, signInDemo, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
