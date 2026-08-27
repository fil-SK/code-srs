import { getRepository, type Card, type Deck, type ReviewLog } from '@itera/core'
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query'
import { act, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities, type DemoEntities } from '@/src/demo/demoEntities'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'

/**
 * Test support for rendering demo screens over the real composed runtime.
 *
 * Not a `*.test.tsx` file, so the runner does not execute it, and under `src/`
 * rather than `app/`, where Expo Router's require.context would pull it into the
 * bundle (itera-decisions D356).
 *
 * DemoWorkspaceProvider composes a fresh InMemoryRepository on mount and
 * registers it, so each render in each test gets an isolated backend - the
 * property the registry's re-registration rule was written for.
 */

// TanStack batches its subscriber notifications onto a macrotask, so a query
// result can land outside the `act` scope the test awaited - which is both an
// act warning and a genuinely unsettled tree. Running the scheduler inline makes
// every notification happen synchronously inside whatever `act` produced it.
// Test-only: the batching exists to coalesce renders in a real app.
notifyManager.setScheduler((cb) => {
  cb()
})

// Every client a test builds, so its cached queries and their garbage-collection
// timers can be torn down. Without this Jest reports "did not exit one second
// after the test run", because an idle QueryClient keeps a pending timeout per
// cached query.
const testClients = new Set<QueryClient>()

afterEach(() => {
  for (const client of testClients) {
    client.clear()
    client.unmount()
  }
  testClients.clear()
})

export function createTestQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      // Matches the demo-mode client. `retry: false` matters most: a query that
      // threw would otherwise be retried past the end of the test.
      queries: { staleTime: 0, retry: false, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  testClients.add(client)
  return client
}

/**
 * Let pending queries, mutations and their invalidations settle.
 *
 * A repository read resolves on the microtask queue, and an invalidation
 * schedules another one, so a single flush is not enough after a mutation.
 */
export async function settleQueries(): Promise<void> {
  // A repository read resolves on the microtask queue and an invalidation
  // schedules another one, so several passes are needed after a mutation. The
  // macrotask turn covers anything that still defers.
  await act(async () => {
    for (let i = 0; i < 4; i += 1) {
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

/** What the repository actually holds right now, read outside React. */
export async function storedEntities(): Promise<DemoEntities> {
  const repo = getRepository()
  const [decks, cards, reviewLogs] = await Promise.all([
    repo.decks.getAll() as Promise<Deck[]>,
    repo.cards.search({ includeSuspended: true }) as Promise<Card[]>,
    repo.reviews.all() as Promise<ReviewLog[]>,
  ])
  return { decks, cards, reviewLogs }
}

/**
 * A probe that publishes whatever the shared hooks currently see.
 *
 * Assertions that care about *reactivity* read this, because it can only change
 * when a query invalidation actually re-rendered a consumer. Assertions that
 * care about what was *written* should read storedEntities() instead.
 */
export function createEntitiesProbe() {
  const seen: { current: DemoEntities & { isLoading: boolean } } = {
    current: { decks: [], cards: [], reviewLogs: [], isLoading: true },
  }
  function EntitiesProbe() {
    seen.current = useDemoEntities()
    return null
  }
  return { seen, EntitiesProbe }
}

/**
 * A probe that publishes the demo workspace value (the clock, the inbox and
 * reset), for tests that need to drive Reset Demo from inside the tree.
 */
export function createWorkspaceProbe() {
  const seen: { current: DemoWorkspaceValue | null } = { current: null }
  function WorkspaceProbe() {
    seen.current = useDemoWorkspace()
    return null
  }
  return { seen, WorkspaceProbe }
}

export function renderInDemo(children: ReactNode) {
  const client = createTestQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <DemoWorkspaceProvider>{children}</DemoWorkspaceProvider>
    </QueryClientProvider>,
  )
  return { ...view, client }
}
