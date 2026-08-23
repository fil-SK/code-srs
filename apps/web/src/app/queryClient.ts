import { QueryClient } from '@tanstack/react-query'

// Local IndexedDB reads are cheap and only change via our own mutations (which
// invalidate). A modest staleTime avoids redundant refetches without risking
// stale data, since mutations explicitly invalidate affected queries.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})
