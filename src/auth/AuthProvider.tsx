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
  /** The Supabase session, or null. Null does NOT mean signed out — see `isAuthenticated`. */
  session: Session | null
  loading: boolean
  email: string | undefined
  /** Whoever is signed in, from either backing store. Null when signed out. */
  identity: AuthIdentity | null
  isAuthenticated: boolean
  signInLocal: (email: string, opts: { remember: boolean }) => void
  signInDemo: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

// Tracks who is signed in, from two independent sources:
//   - the Supabase session, when cloud sync is configured (unchanged behavior);
//   - a local session (src/auth/localSession.ts), which is how the default
//     local-first mode has an account boundary at all.
// Either one counts as signed in. Routing gates on `isAuthenticated`
// (src/auth/RequireAuth.tsx); nothing else in the app inspects storage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [local, setLocal] = useState<LocalSession | null>(() => readLocalSession())

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const sb = getSupabase()

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signInLocal = useCallback(
    (email: string, { remember }: { remember: boolean }) => {
      const next = createLocalSession(email, 'local')
      writeLocalSession(next, { remember })
      setLocal(next)
    },
    [],
  )

  // The demo workspace is deliberately not remembered across browser restarts:
  // it is a look-around identity, not an account someone means to keep.
  const signInDemo = useCallback(() => {
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
    // A real Supabase session outranks a local one: if both exist, the cloud
    // identity is the one whose data the app is actually reading.
    const identity: AuthIdentity | null = session?.user.email
      ? { email: session.user.email, kind: 'supabase' }
      : local
        ? { email: local.email, kind: local.kind }
        : null

    return {
      session,
      loading,
      email: identity?.email,
      identity,
      isAuthenticated: session !== null || local !== null,
      signInLocal,
      signInDemo,
      signOut,
    }
  }, [session, loading, local, signInLocal, signInDemo, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
