import type { AuthConfig, LocalSessionStore } from '@itera/core'

import { getMobileSupabase } from '@/src/data/supabaseClient'

// What this platform hands @itera/core's shared auth layer. Nothing more.
//
// The mode decision, the session lifecycle, the bootstrap, the identity rule and
// the "am I signed in?" answer all stay in core (packages/core/src/auth/). This
// file supplies the two things core deliberately refuses to know: which mode is
// active, and how to reach a Supabase client.

/**
 * A `LocalSessionStore` that stores nothing.
 *
 * Core's `LocalSessionStore` is the seam for the *local/demo* session record - a
 * development shell for an install with no backend. The first mobile client is
 * cloud-only, so that record has no meaning here: `resolveAuthState` in Supabase
 * mode never reads it, `signInLocal`/`signInDemo` are already no-ops in that
 * mode, and the engine's one interaction with this object is a defensive
 * `clear()` at bootstrap.
 *
 * Supplying an inert store is therefore the honest implementation, and it is
 * also the safe one: there is no native local record that could ever become a
 * second way to be authenticated, which is precisely the class of bug audit
 * P1-3 was. A SecureStore-backed implementation here would be a second session
 * abstraction with nothing to store.
 */
export const inertLocalSessionStore: LocalSessionStore = {
  read: () => null,
  write: () => {},
  clear: () => {},
}

/**
 * Always Supabase mode. Unlike web - which resolves a `cloudEnabled` boolean and
 * configures both the repository and auth from that one value - mobile has only
 * one backend to choose from, so the two cannot disagree by construction. A
 * build with no configuration does not fall back to a local mode; the
 * composition root refuses to mount the app at all and says why.
 */
export function createMobileAuthConfig(): AuthConfig {
  return {
    mode: 'supabase',
    localSessionStore: inertLocalSessionStore,
    getSupabaseClient: getMobileSupabase,
  }
}
