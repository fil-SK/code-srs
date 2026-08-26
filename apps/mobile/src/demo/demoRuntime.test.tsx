import { getRepository, useCreateDeck, useDeleteDeck, useSaveDeck } from '@itera/core'
import { act, cleanup, render } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'

import { InMemoryRepository } from '@/src/data/InMemoryRepository'
import { getMobileSupabase } from '@/src/data/supabaseClient'
import { createTestQueryClient, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { useDemoEntities } from './demoEntities'
import { demoCollections, demoLibraryViewModel } from './demoSelectors'
import { createDemoSeed } from './demoWorkspace'
import { demoStartedAt } from './demoRuntime'
import { DemoWorkspaceProvider } from './DemoWorkspaceProvider'
import { useDemoWorkspace, type DemoWorkspaceValue } from './demoWorkspaceContext'

// The demo runtime as composed: which backend it registers, whether a repository
// write reaches the screens, and what a reset restores.
//
// The mutation hooks used here are the shared ones - the same useCreateDeck,
// useSaveDeck and useDeleteDeck web calls. No authoring UI exists yet, so these
// stand in for it: what is being proved is that the seam works end to end, which
// is the whole claim of this milestone.

jest.mock('@/src/data/supabaseClient', () => ({
  isMobileSupabaseConfigured: false,
  getMobileSupabase: jest.fn(() => {
    throw new Error('Demo mode must never construct a Supabase client.')
  }),
}))

const NOW_KEYS = ['decks', 'cards', 'reviewLogs'] as const

afterEach(cleanup)

let demo: DemoWorkspaceValue
let seen: ReturnType<typeof useDemoEntities>
let deckActions: {
  create: ReturnType<typeof useCreateDeck>
  save: ReturnType<typeof useSaveDeck>
  remove: ReturnType<typeof useDeleteDeck>
}

function Probe() {
  demo = useDemoWorkspace()
  seen = useDemoEntities()
  deckActions = { create: useCreateDeck(), save: useSaveDeck(), remove: useDeleteDeck() }
  return null
}

async function mount() {
  const view = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoWorkspaceProvider>
        <Probe />
      </DemoWorkspaceProvider>
    </QueryClientProvider>,
  )
  await settleQueries()
  return view
}

describe('demo composition', () => {
  it('registers the in-memory backend, and never a Supabase one', async () => {
    await mount()

    expect(getRepository()).toBeInstanceOf(InMemoryRepository)
    expect(getMobileSupabase).not.toHaveBeenCalled()
  })

  it('resolves one instance, so screens and hooks share a backend', async () => {
    await mount()
    expect(getRepository()).toBe(getRepository())
  })

  it('seeds the backend with the deterministic dataset', async () => {
    await mount()
    const pristine = createDemoSeed(demoStartedAt())
    const stored = await storedEntities()

    for (const key of NOW_KEYS) {
      expect(stored[key]).toHaveLength(pristine[key].length)
    }
    expect(stored.decks.map((deck) => deck.id).sort()).toEqual(
      pristine.decks.map((deck) => deck.id).sort(),
    )
  })

  it('derives the same seed twice from one anchor, which is what repeatable recordings need', () => {
    const anchor = Date.UTC(2026, 7, 24, 9, 0, 0)
    expect(createDemoSeed(anchor)).toEqual(createDemoSeed(anchor))
  })

  it('keeps the notification inbox outside the repository', async () => {
    await mount()
    expect(demo.notifications.length).toBeGreaterThan(0)
    // Nothing in the Repository contract stores a notification, and nothing
    // pretends to: the inbox is provider state.
    expect(await storedEntities()).not.toHaveProperty('notifications')
  })
})

describe('a repository write reaches the screens', () => {
  it('re-renders consumers after useCreateDeck, with no manual refresh', async () => {
    await mount()
    const before = seen.decks.length

    await act(async () => {
      await deckActions.create.mutateAsync({ name: 'Authored deck' })
    })
    await settleQueries()

    expect(seen.decks).toHaveLength(before + 1)
    expect(seen.decks.some((deck) => deck.name === 'Authored deck')).toBe(true)
    // And the Library view model built from those entities sees it too, which is
    // the surface a learner would actually be looking at.
    expect(
      demoLibraryViewModel(seen, demo.now).decks.some((deck) => deck.name === 'Authored deck'),
    ).toBe(true)
  })

  it('re-renders after useSaveDeck', async () => {
    await mount()

    const deck = seen.decks.find((entry) => entry.id === 'fixture-modern-cpp')!
    await act(async () => {
      await deckActions.save.mutateAsync({ ...deck, name: 'Renamed on the phone' })
    })
    await settleQueries()

    expect(seen.decks.find((entry) => entry.id === 'fixture-modern-cpp')?.name).toBe(
      'Renamed on the phone',
    )
  })

  it('re-renders after useDeleteDeck', async () => {
    await mount()
    const before = seen.decks.length

    await act(async () => {
      await deckActions.remove.mutateAsync('fixture-security-engineering')
    })
    await settleQueries()

    expect(seen.decks).toHaveLength(before - 1)
    expect(seen.decks.some((deck) => deck.id === 'fixture-security-engineering')).toBe(false)
  })

  it('puts a deck authored with a parentId into the derived collection immediately', async () => {
    await mount()

    await act(async () => {
      await deckActions.create.mutateAsync({ name: 'Child deck', parentId: 'fixture-research' })
    })
    await settleQueries()

    const collections = demoCollections(seen)
    expect(collections.map((collection) => collection.id)).toContain('fixture-research')
    expect(
      seen.decks.find((deck) => deck.name === 'Child deck')?.parentId,
    ).toBe('fixture-research')
  })
})

describe('reset', () => {
  it('discards decks authored during the run and clears the query cache', async () => {
    await mount()
    const before = seen.decks.length

    await act(async () => {
      await deckActions.create.mutateAsync({ name: 'Temporary' })
    })
    await settleQueries()
    expect(seen.decks).toHaveLength(before + 1)

    act(() => demo.resetDemoWorkspace())
    await settleQueries()

    // The rendered tree, not just the store: without queryClient.clear() the
    // screens would keep showing the pre-reset entities from cache.
    expect(seen.decks).toHaveLength(before)
    expect(seen.decks.some((deck) => deck.name === 'Temporary')).toBe(false)

    const stored = await storedEntities()
    expect(stored.decks.some((deck) => deck.name === 'Temporary')).toBe(false)
  })

  it('restores the seeded dataset byte for byte from the recorded anchor', async () => {
    await mount()
    const pristine = createDemoSeed(demoStartedAt())

    await act(async () => {
      await deckActions.remove.mutateAsync('fixture-security-engineering')
      await deckActions.create.mutateAsync({ name: 'Temporary' })
    })
    await settleQueries()

    act(() => demo.resetDemoWorkspace())
    await settleQueries()

    const stored = await storedEntities()
    const byId = <T extends { id: string }>(rows: T[]) =>
      [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    expect(byId(stored.decks)).toEqual(byId(pristine.decks))
    expect(byId(stored.cards)).toEqual(byId(pristine.cards))
    expect(stored.reviewLogs).toEqual(pristine.reviewLogs)
    expect(demo.notifications).toEqual(pristine.notifications)
  })
})
