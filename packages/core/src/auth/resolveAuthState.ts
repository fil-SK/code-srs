import type { Session } from '@supabase/supabase-js'
import type { AuthIdentity, AuthMode, LocalSession } from './types'

// Audit P1-3, as one pure function, in one place.
//
// The bug this exists to prevent: `isAuthenticated` was `session !== null ||
// local !== null` and never consulted which backend was actually running, so an
// origin that later gained cloud configuration admitted every returning visitor
// on a stale local record into a Supabase-backed app with no Supabase user -
// empty reads, failing writes, and a login screen that redirected away.
//
// The rule is that the active backend decides which session is a session. A
// record from the inactive mode is neither an identity nor an admission ticket.
// Any platform that answers "am I signed in?" differently has reintroduced the
// bug, which is why this is shared rather than reimplemented per app.

export interface AuthStateInput {
  mode: AuthMode
  supabaseSession: Session | null
  localSession: LocalSession | null
}

export interface ResolvedAuthState {
  identity: AuthIdentity | null
  isAuthenticated: boolean
}

export function resolveAuthState({
  mode,
  supabaseSession,
  localSession,
}: AuthStateInput): ResolvedAuthState {
  if (mode === 'supabase') {
    // Deliberately asymmetric, and preserved as it shipped: a session with no
    // user email is authenticated but has no identity to show. The app is not
    // going to lock someone out over a missing profile field.
    return {
      identity: supabaseSession?.user.email
        ? { email: supabaseSession.user.email, kind: 'supabase' }
        : null,
      isAuthenticated: supabaseSession !== null,
    }
  }

  return {
    identity: localSession ? { email: localSession.email, kind: localSession.kind } : null,
    isAuthenticated: localSession !== null,
  }
}
