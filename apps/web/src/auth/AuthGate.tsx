import type { ReactNode } from 'react'
import { LogoLoader } from '@/components/brand/LogoLoader'
import { useAuth } from './AuthProvider'

// Waits for the Supabase session bootstrap before rendering the router, so a
// configured cloud session is known by the time RequireAuth first runs and a
// signed-in user is never bounced to /login on a refresh.
//
// It no longer decides whether the login screen renders: that is routing's job
// now (RequireAuth + the /login route), because local mode has a real session
// boundary too and gating outside the router could not redirect.
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LogoLoader />
      </div>
    )
  }

  return <>{children}</>
}
