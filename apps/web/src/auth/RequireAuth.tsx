import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

// The single route guard. Every product route (the AppShell tree and Review)
// hangs off this; /login and /design-preview/* deliberately do not.
//
// `from` is carried through so signing in returns to whatever was originally
// asked for instead of always dropping the user on Today.
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // AuthGate already blocks on this, so this is belt-and-braces for any future
  // caller that mounts the router without it.
  if (loading) return null

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
