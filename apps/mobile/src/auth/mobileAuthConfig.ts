import type { AuthConfig, LocalSessionStore } from '@itera/core'

import { mobileRuntimeMode } from '@/src/config/mobileRuntimeMode'
import { getMobileSupabase } from '@/src/data/supabaseClient'
import { demoSessionStore } from './demoSessionStore'

// What this platform hands @itera/core's shared auth layer. Nothing more.
//
// The session lifecycle, the bootstrap, the identity rule and the "am I signed
// in?" answer all stay in core (packages/core/src/auth/). This file supplies
// the two things core deliberately refuses to know: which mode is active, and
// how to reach a Supabase client.
//
// The mode decision itself is not made here either - it comes from
// src/config/mobileRuntimeMode.ts, which the composition root reads once for
// both the repository and auth, so backend mode and auth mode cannot disagree
// (audit P1-3, and the same single-value rule apps/web/src/main.tsx follows).

/**
 * A `LocalSessionStore` that stores nothing.
 *
 * Core's `LocalSessionStore` is the seam for the *local/demo* session record.
 * Cloud mode is Supabase mode, where that record has no meaning:
 * `resolveAuthState` never reads it, `signInLocal`/`signInDemo` are already
 * no-ops there, and the engine's one interaction with this object is a
 * defensive `clear()` at bootstrap.
 *
 * Supplying an inert store is therefore the honest implementation, and it is
 * also the safe one: there is no native local record that could ever become a
 * second way to be authenticated in a cloud build, which is precisely the class
 * of bug audit P1-3 was. Demo mode supplies `demoSessionStore` instead, and the
 * two can never be active at once.
 */
export const inertLocalSessionStore: LocalSessionStore = {
  read: () => null,
  write: () => {},
  clear: () => {},
}

/**
 * Cloud mode is Supabase mode; demo mode is core's local mode over a pre-seeded
 * demo record.
 *
 * Cloud is unchanged from M1A: one backend, so backend and auth mode cannot
 * disagree by construction, and a build with no configuration does not fall
 * back - the composition root refuses to mount and says why.
 *
 * Demo reaches no network at all. Core's engine leaves `loading` false in local
 * mode, reads the demo record during construction and returns a no-op from
 * `start()`, so the app is authenticated on its first frame with no OTP, no
 * Supabase client and no configuration.
 */
export function createMobileAuthConfig(): AuthConfig {
  if (mobileRuntimeMode === 'demo') {
    return {
      mode: 'local',
      localSessionStore: demoSessionStore,
    }
  }

  return {
    mode: 'supabase',
    localSessionStore: inertLocalSessionStore,
    getSupabaseClient: getMobileSupabase,
  }
}
