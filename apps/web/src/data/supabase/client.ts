import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase connection, configured via env (.env.local). When these are absent
// the app falls back to local Dexie storage, so development works with no setup.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

// Lazily create a single shared client. Throws if called without config, so
// callers should guard on isSupabaseConfigured first.
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured (missing VITE_SUPABASE_* env).')
  }
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
