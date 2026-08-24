import { configureRepository, SupabaseRepository } from '@itera/core'

import { getMobileSupabase } from '@/src/data/supabaseClient'

// The mobile app's composition point, and the only place a backend is named.
//
// The mirror of apps/web/src/main.tsx: register a factory before anything can
// issue a query, and let the registry construct on first use. The factory is not
// called here - `getRepository()` builds it lazily - so importing this module
// does not open a connection, and a screen that never queries never triggers one.
//
// SupabaseRepository is used verbatim, including its `selectAll` pagination.
// A hand-rolled `supabase.from('cards').select()` on this platform would
// reintroduce audit P1-4 on a second client, which is the whole reason the class
// takes a ready client instead of building one.
export function composeMobileRepository(): void {
  configureRepository(() => new SupabaseRepository(getMobileSupabase()))
}
