import { QueryClient } from '@tanstack/react-query'

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
// Deliberately no persistence layer and no offline cache: this client is
// cloud-only by decision, and an offline story is later master-plan work.
export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  })
}
