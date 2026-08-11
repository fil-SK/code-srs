import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { LoginBrandPanel } from './LoginBrandPanel'
import { SignInPanel } from './SignInPanel'

// /login — a top-level route with no AppShell ancestor, so it is chrome-free by
// construction (the same structural pattern Review and design-preview use), and
// outside RequireAuth for the obvious reason.
//
// Layout: one restrained surface on the Itera canvas, split into the larger
// product half and the quieter sign-in half. Below `lg` the two stack with the
// form first, because on a phone the form is the whole point of the page and
// the brand block is context.
export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // Where sign-in lands: back to whatever RequireAuth bounced, else Today.
  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from && from !== '/login' ? from : '/'

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

  return (
    <IteraSurface className="min-h-dvh">
      <main className="flex min-h-dvh items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[1180px] overflow-hidden rounded-[20px] border border-itera-border bg-itera-surface-subtle shadow-[var(--itera-shadow-card)] lg:grid lg:grid-cols-[1.38fr_1fr]">
          <LoginBrandPanel />
          {/* Stacked below lg, where the brand block above it collapses to just
              the mark and the headline (the illustration and principles drop
              out) so the form still lands within the first screen. */}
          <div className="p-4 sm:p-6 lg:flex lg:items-center lg:border-l lg:border-itera-border lg:p-6">
            <SignInPanel redirectTo={redirectTo} />
          </div>
        </div>
      </main>
    </IteraSurface>
  )
}
