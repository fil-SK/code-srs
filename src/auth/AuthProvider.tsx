import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client'

interface AuthValue {
  session: Session | null
  loading: boolean
  email: string | undefined
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

// Tracks the Supabase auth session. When Supabase is not configured the app runs
// in local-only mode: there is no session and nothing to gate.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

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

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      email: session?.user.email,
      signOut: async () => {
        if (isSupabaseConfigured) await getSupabase().auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
