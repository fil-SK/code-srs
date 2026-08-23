import type { AuthConfig } from '@itera/core'
import { getSupabase } from '@/data/supabase/client'
import { browserSessionStore } from './localSession'

// What the browser supplies to @itera/core's shared auth layer: a decided mode,
// a session store, and a way to reach the Supabase client - never the client
// itself, and never the environment it was configured from.
//
// `cloudEnabled` is a parameter rather than a read of `isSupabaseConfigured`,
// because the decision belongs to the composition root (src/main.tsx), which
// makes it once and uses it for both the repository backend and authentication.
// Two independent reads of the same predicate is how those two drifted apart
// once already (audit P1-3).
export function createWebAuthConfig(cloudEnabled: boolean): AuthConfig {
  return cloudEnabled
    ? {
        mode: 'supabase',
        localSessionStore: browserSessionStore,
        getSupabaseClient: getSupabase,
      }
    : { mode: 'local', localSessionStore: browserSessionStore }
}
