import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

import { secureSessionStorage } from './secureSessionStorage'

// The mobile app's Supabase connection, and the only place this workspace reads
// its own configuration.
//
// @itera/core takes a ready client and never looks at an environment, which is
// exactly what lets the same SupabaseRepository and the same auth engine run
// under Metro and under Vite. Everything Expo-specific stops here: core learns
// nothing about EXPO_PUBLIC_*, SecureStore, AppState or React Native.
//
// The two variables are read as static `process.env.EXPO_PUBLIC_*` member
// expressions on purpose. Expo inlines those at build time by textual
// substitution, so a computed lookup would silently resolve to undefined in a
// production bundle.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/**
 * Whether this build has cloud configuration at all. The composition root reads
 * it once, exactly as the web app reads `isSupabaseConfigured` once - the two
 * platforms differ in what happens when it is false (web falls back to local
 * Dexie storage; mobile is cloud-only and says so) but not in the shape of the
 * decision.
 */
export const isMobileSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

export function getMobileSupabase(): SupabaseClient {
  if (!isMobileSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    )
  }
  if (client) return client

  client = createClient(url as string, anonKey as string, {
    auth: {
      storage: secureSessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      // There is no browser URL to inspect and no magic-link return on this
      // platform: mobile signs in with a six-digit OTP typed into the app, so
      // leaving this on would only make the client look for a callback that
      // never arrives.
      detectSessionInUrl: false,
    },
  })

  // supabase-js cannot tell whether a native app is in the foreground, so the
  // refresh timer is driven explicitly. Bound here, once, at the moment a
  // client first exists: binding it at module scope would run on import even in
  // an unconfigured build, and binding it from a React effect would tie a
  // process-lifetime concern to a component's lifetime.
  client.auth.startAutoRefresh()
  AppState.addEventListener('change', (status) => {
    if (status === 'active') void client?.auth.startAutoRefresh()
    else void client?.auth.stopAutoRefresh()
  })

  return client
}
