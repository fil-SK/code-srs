// @vitest-environment happy-dom
//
// The proof that the hooks resolve storage when they run, not when they are
// imported. This is the regression the whole extraction turns on: every hook
// module used to open with `const repo = getRepository()`, and a module-scope
// capture is invisible until something needs a *different* repository - a
// second platform, or a test.
//
// It lives in the web project rather than in core because a hook needs a React
// renderer and core deliberately has no DOM. Core covers the complementary
// half (importing the modules against an unconfigured registry) in
// packages/core/src/hooks/moduleScope.test.ts.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import type { Deck, Repository } from '@itera/core'
import { configureRepository } from '@itera/core'
import { DexieRepository } from '@/data/dexie/DexieRepository'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'

// Globals are not enabled, so RTL's automatic cleanup never registers (D24).
afterEach(() => cleanup())

function deck(id: string, name: string): Deck {
  return { id, name, createdAt: 0, updatedAt: 0 }
}

// Only the deck surface is exercised, so the rest stays unimplemented on
// purpose: a hook that reached for anything else would throw rather than
// quietly read a plausible empty value.
function fakeRepository(decks: Deck[]) {
  const rows = [...decks]
  const repo = {
    decks: {
      getAll: async () => [...rows],
      put: async (d: Deck) => {
        rows.push(d)
      },
    },
  } as unknown as Repository
  return { repo, rows }
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  configureRepository(() => fakeRepository([deck('a', 'Alpha')]).repo)
})

// Leave the registry as the rest of the web suite expects to find it.
afterEach(() => {
  configureRepository(() => new DexieRepository())
})

describe('a query hook', () => {
  it('reads the configured repository', async () => {
    const { result } = renderHook(() => useDecks(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((d) => d.name)).toEqual(['Alpha'])
  })

  it('uses the repository configured *after* the module was imported', async () => {
    // The hook module was imported at the top of this file, before either
    // configureRepository() call. A module-scope capture would have frozen
    // whatever was configured then - the web setup's Dexie - and this would
    // read an empty database instead.
    configureRepository(() => fakeRepository([deck('z', 'Zulu')]).repo)

    const { result } = renderHook(() => useDecks(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((d) => d.name)).toEqual(['Zulu'])
  })
})

describe('a mutation hook', () => {
  it('writes to the configured repository', async () => {
    const { repo, rows } = fakeRepository([])
    configureRepository(() => repo)

    const { result } = renderHook(() => useCreateDeck(), { wrapper: wrapper() })
    await result.current.mutateAsync({ name: 'Written' })

    expect(rows.map((d) => d.name)).toEqual(['Written'])
  })

  it('follows a reconfiguration between mounts', async () => {
    const first = fakeRepository([])
    const second = fakeRepository([])

    configureRepository(() => first.repo)
    const a = renderHook(() => useCreateDeck(), { wrapper: wrapper() })
    await a.result.current.mutateAsync({ name: 'To first' })

    configureRepository(() => second.repo)
    const b = renderHook(() => useCreateDeck(), { wrapper: wrapper() })
    await b.result.current.mutateAsync({ name: 'To second' })

    expect(first.rows.map((d) => d.name)).toEqual(['To first'])
    expect(second.rows.map((d) => d.name)).toEqual(['To second'])
  })
})
