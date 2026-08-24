// Which application this build is: the deterministic demo, or the cloud client.
//
// Two modes, decided once, read by the composition root. Demo is the default
// because the current business goal is market validation: a build with no
// configuration must open the product immediately rather than refuse to run.
// Cloud is opt-in and additionally requires valid Supabase configuration, so a
// half-configured build is never silently inferred to be a cloud app.
//
// The environment variable is read as a static `process.env.EXPO_PUBLIC_*`
// member expression on purpose, the same rule src/data/supabaseClient.ts
// follows: Expo inlines those at build time by textual substitution, so a
// computed lookup would resolve to undefined in a production bundle.
//
// Demo mode is a temporary product-demo path, not the future persistence
// architecture. Its data is deterministic demo data - never synced, never
// cloud-backed, never a persisted account.

export type MobileRuntimeMode = 'demo' | 'cloud'

export const mobileRuntimeMode: MobileRuntimeMode =
  process.env.EXPO_PUBLIC_ITERA_MODE === 'cloud' ? 'cloud' : 'demo'

export const isDemoMode = mobileRuntimeMode === 'demo'
