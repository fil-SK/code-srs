import { QueryClient } from '@tanstack/react-query'

import { mobileRuntimeMode } from '@/src/config/mobileRuntimeMode'

// The mobile app's one QueryClient.
//
// Same shared hooks and same query keys as web, but two composition values
// differ because the platform does, not because the product does:
//
// - `retry: 1`. Web reads IndexedDB, where a failure is a real fault worth
//   surfacing immediately. Every mobile read is a request over a phone radio,
//   where a single transient failure is ordinary. One retry is the smallest
//   allowance that covers it without turning a genuine outage into a long wait.
// - `refetchOnWindowFocus: true`. Web disables it because local storage only
//   changes through our own mutations, which already invalidate. Mobile reads a
//   shared cloud workspace that the web app may have changed while the phone was
//   in someone's pocket, so returning to the foreground is exactly when a
//   refetch is worth making. `focusManager` is bound to AppState for this to
//   mean anything (see appStateFocus.ts).
//
// Demo mode reads an in-memory repository in the same process, so both of those
// allowances are wrong there and one of them is actively confusing: a read costs
// nothing, a read cannot fail transiently, and a 30-second staleness window
// around a store the user just wrote to invites "why is this screen behind?".
// The mutation hooks invalidate, so a stale window is never load-bearing for
// correctness either way - this only decides whether a remount re-reads.
//
// Deliberately no persistence layer and no offline cache in either mode: an
// offline story is later master-plan work.
const CLOUD_QUERIES = {
  staleTime: 30_000,
  retry: 1,
  refetchOnWindowFocus: true,
} as const

const DEMO_QUERIES = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const

export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: mobileRuntimeMode === 'demo' ? { ...DEMO_QUERIES } : { ...CLOUD_QUERIES },
    },
  })
}
