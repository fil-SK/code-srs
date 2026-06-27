import type { ReactNode } from 'react'
import { isSupabaseConfigured } from '@/data/supabase/client'
import { useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'

// Decides whether the app or the login screen renders. In local-only mode
// (no Supabase config) it never gates. With Supabase, it waits for the session
// check, then shows the app or the login screen.
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (!isSupabaseConfigured) return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted">
        Loading…
      </div>
    )
  }

  if (!session) return <LoginPage />

  return <>{children}</>
}
