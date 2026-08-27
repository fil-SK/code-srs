import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'

import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoEntities } from '@/src/demo/demoEntities'
import { demoDeckViewModel, demoScopeRail, resolveDemoScope } from '@/src/demo/demoSelectors'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { createTestQueryClient, settleQueries, storedEntities } from '@/src/test/demoHarness'
import { resetRouterCalls, routerCalls, routerDouble } from '@/src/test/routerDouble'
import { DeckFormScreen } from './DeckFormScreen'

// Native Deck CRUD end to end, over the real composed demo runtime.
//
// What is proved here is the binding, not the rules: the rules are core's
// `validateDeckForm` and `checkDeckDeletion`, unit-tested there. These assert
// that the native screens call them, that the writes land in the configured
// Repository through the shared hooks, that every derived surface follows with
// no restart, and that Reset Demo discards what was authored.

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

jest.mock('@/src/data/supabaseClient', () => ({
  isMobileSupabaseConfigured: false,
  getMobileSupabase: jest.fn(() => {
    throw new Error('Demo mode must never construct a Supabase client.')
  }),
}))

afterEach(cleanup)

let demo: DemoWorkspaceValue
let seen: ReturnType<typeof useDemoEntities>

function Probe() {
  demo = useDemoWorkspace()
  seen = useDemoEntities()
  return null
}

async function mount(children: React.ReactNode) {
  const view = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoWorkspaceProvider>
        <Probe />
        {children}
      </DemoWorkspaceProvider>
    </QueryClientProvider>,
  )
  await settleQueries()
  return view
}

beforeEach(() => {
  resetRouterCalls()
})

describe('creating a deck', () => {
  it('refuses a blank name and enables Save once one is typed', async () => {
    await mount(<DeckFormScreen onCancel={() => {}} onSaved={() => {}} target={{ kind: 'create' }} />)

    const save = screen.getByLabelText('Create deck')
    expect(save.props.accessibilityState.disabled).toBe(true)

    fireEvent.changeText(screen.getByTestId('deck-name-input'), '   ')
    expect(screen.getByLabelText('Create deck').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByText('Deck name is required.')).toBeTruthy()

    fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Register allocation')
    expect(screen.getByLabelText('Create deck').props.accessibilityState.disabled).toBe(false)
  })

  it('writes a canonical top-level Deck through the shared hook', async () => {
    const saved: string[] = []
    await mount(
      <DeckFormScreen
        onCancel={() => {}}
        onSaved={(deck) => saved.push(deck.id)}
        target={{ kind: 'create' }}
      />,
    )

    fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Register allocation')
    fireEvent.changeText(screen.getByTestId('deck-description-input'), 'Linear scan and graph colouring')
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Create deck'))
    })
    await settleQueries()

    const { decks } = await storedEntities()
    const created = decks.find((deck) => deck.name === 'Register allocation')
    expect(created).toBeTruthy()
    expect(created?.description).toBe('Linear scan and graph colouring')
    expect(created?.parentId).toBeUndefined()
    expect(created?.createdAt).toBeGreaterThan(0)
    expect(saved).toEqual([created?.id])
  })

  it('files a deck inside a collection through parentId alone, and every derived surface follows', async () => {
    const collectionId = 'fixture-languages-cpp'
    const { decks: before } = await storedEntities()
    void before

    await mount(
      <DeckFormScreen
        onCancel={() => {}}
        onSaved={() => {}}
        target={{
          kind: 'create',
          parent: { id: collectionId, name: 'C++', createdAt: 0, updatedAt: 0 },
        }}
      />,
    )

    fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Move semantics')
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Create deck'))
    })
    await settleQueries()

    const entities = await storedEntities()
    const created = entities.decks.find((deck) => deck.name === 'Move semantics')
    expect(created?.parentId).toBe(collectionId)
    // No second membership field exists, and none was invented.
    expect(Object.keys(created ?? {})).not.toContain('collectionId')

    // Membership is derived, so the collection screen's own list contains it
    // with nothing else written.
    const scope = resolveDemoScope(entities, collectionId)
    expect(scope?.decks.map((deck) => deck.id)).toContain(created?.id)
    expect(demoScopeRail(entities).some((entry) => entry.id === collectionId)).toBe(true)

    // And the shared hooks re-rendered a consumer with it, without a restart.
    expect(seen.decks.some((deck) => deck.id === created?.id)).toBe(true)
  })

  it('promotes an ordinary deck to a Collection when it receives a child, with no fixture edited', async () => {
    const leafId = 'fixture-modern-cpp'
    await mount(
      <DeckFormScreen
        onCancel={() => {}}
        onSaved={() => {}}
        target={{
          kind: 'create',
          parent: { id: leafId, name: 'Modern C++', createdAt: 0, updatedAt: 0 },
        }}
      />,
    )

    fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Concepts')
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Create deck'))
    })
    await settleQueries()

    const entities = await storedEntities()
    expect(demoScopeRail(entities).some((entry) => entry.id === leafId)).toBe(true)
  })
})

// The edit form has to be given the record the mounted repository holds, so it
// reads the deck through the shared hooks exactly as the edit route does.
function DeckEditHost({ deckId }: { deckId: string }) {
  const { decks } = useDemoEntities()
  const deck = decks.find((entry) => entry.id === deckId)
  return deck ? (
    <DeckFormScreen onCancel={() => {}} onSaved={() => {}} target={{ kind: 'edit', deck }} />
  ) : null
}

describe('editing a deck', () => {
  it('loads the deck, saves the change and preserves its identity and parent', async () => {
    await mount(<DeckEditHost deckId="fixture-modern-cpp" />)

    const before = (await storedEntities()).decks.find((deck) => deck.id === 'fixture-modern-cpp')
    expect(before).toBeTruthy()
    expect(screen.getByTestId('deck-name-input').props.value).toBe(before!.name)

    fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Modern C++ (2026)')
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save deck'))
    })
    await settleQueries()

    const after = (await storedEntities()).decks.find((deck) => deck.id === before!.id)
    expect(after?.name).toBe('Modern C++ (2026)')
    expect(after?.id).toBe(before!.id)
    expect(after?.createdAt).toBe(before!.createdAt)
    expect(after?.parentId).toBe(before!.parentId)
  })
})

// Mirrors the real deck route: read the entities through the shared hooks and
// build the view model from them, so the screen is looking at the same
// repository the mutation writes to and re-derives after it.
function DeckHost({ deckId }: { deckId: string }) {
  const entities = useDemoEntities()
  const viewModel = demoDeckViewModel(entities, deckId, Date.now())
  return viewModel ? <LibraryDeckScreen viewModel={viewModel} /> : null
}

describe('deleting a deck', () => {
  async function mountDeck(deckId: string) {
    await mount(<DeckHost deckId={deckId} />)
    const viewModel = demoDeckViewModel(await storedEntities(), deckId, Date.now())
    if (!viewModel) throw new Error(`missing deck ${deckId}`)
    return viewModel
  }

  it('refuses a deck that still has cards, naming what is in the way', async () => {
    const viewModel = await mountDeck('fixture-modern-cpp')
    expect(viewModel.cardCount).toBeGreaterThan(0)

    fireEvent.press(screen.getByLabelText('Deck actions'))
    fireEvent.press(screen.getByLabelText('Delete deck'))

    expect(screen.getByText(/isn.t empty/)).toBeTruthy()
    expect(screen.getByText(new RegExp(`${viewModel.cardCount} cards`))).toBeTruthy()

    // Nothing was removed, and no destructive confirmation was offered.
    expect(screen.queryByLabelText(`Delete ${viewModel.name}`)).toBeNull()
    const after = await storedEntities()
    expect(after.decks.some((deck) => deck.id === viewModel.id)).toBe(true)
  })

  it('refuses a collection deck, because its child decks would be stranded', async () => {
    const entities = await storedEntities()
    const collection = entities.decks.find((deck) =>
      entities.decks.some((other) => other.parentId === deck.id),
    )
    expect(collection).toBeTruthy()

    const viewModel = await mountDeck(collection!.id)
    expect(viewModel.childDeckCount).toBeGreaterThan(0)

    fireEvent.press(screen.getByLabelText('Deck actions'))
    fireEvent.press(screen.getByLabelText('Delete deck'))

    expect(screen.getByText(/isn.t empty/)).toBeTruthy()
    // The refusal names the child decks specifically, which is the fact that
    // blocks it - core decided that, this only reports it.
    expect(
      screen.getByText(
        new RegExp(`${viewModel.childDeckCount} deck${viewModel.childDeckCount === 1 ? '' : 's'}`),
      ),
    ).toBeTruthy()
    expect((await storedEntities()).decks.some((deck) => deck.id === collection!.id)).toBe(true)
  })

  it('deletes an empty deck behind a confirmation that names it, then leaves the route', async () => {
    // The seed keeps several genuinely empty decks (D406), which is exactly the
    // allowed shape: no cards of its own and no children.
    const entities = await storedEntities()
    const empty = entities.decks.find(
      (deck) =>
        !entities.cards.some((card) => card.deckId === deck.id) &&
        !entities.decks.some((other) => other.parentId === deck.id),
    )
    expect(empty).toBeTruthy()

    const viewModel = await mountDeck(empty!.id)
    expect(viewModel.cardCount).toBe(0)
    expect(viewModel.childDeckCount).toBe(0)

    fireEvent.press(screen.getByLabelText('Deck actions'))
    fireEvent.press(screen.getByLabelText('Delete deck'))

    // The confirmation names the deck in words, not by colour alone.
    expect(screen.getByText(`Delete “${viewModel.name}”?`)).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByLabelText(`Delete ${viewModel.name}`))
    })
    await settleQueries()

    expect((await storedEntities()).decks.some((deck) => deck.id === empty!.id)).toBe(false)
    // Not left standing on the route of a deck that no longer exists: the
    // screen went back rather than replacing this route with another one.
    expect(routerCalls.replace).toEqual([])
    expect(routerDouble.canGoBack()).toBe(true)
  })
})

describe('Reset Demo', () => {
  it('discards an authored deck and restores the deterministic seed', async () => {
    await mount(<DeckFormScreen onCancel={() => {}} onSaved={() => {}} target={{ kind: 'create' }} />)

    const seededCount = seen.decks.length

    fireEvent.changeText(screen.getByTestId('deck-name-input'), 'Ephemeral')
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Create deck'))
    })
    await settleQueries()
    expect(seen.decks).toHaveLength(seededCount + 1)

    await act(async () => {
      demo.resetDemoWorkspace()
    })
    await settleQueries()

    expect(seen.decks).toHaveLength(seededCount)
    expect(seen.decks.some((deck) => deck.name === 'Ephemeral')).toBe(false)
  })
})
