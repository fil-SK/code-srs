import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoCollectionViewModel } from '@/src/demo/demoSelectors'
import { createDemoSeed } from '@/src/demo/demoWorkspace'
import {
  pushedCardIds,
  pushedDeckIds,
  resetRouterCalls,
  routerCalls,
  routerDouble,
} from '@/src/test/routerDouble'
import type { MobileCollectionViewModel } from '@/src/types/library'
import { LibraryCollectionScreen } from './LibraryCollectionScreen'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

// Exactly one row on this screen used to navigate - the one whose id was
// hard-coded to fixture-modern-cpp. Every other deck was rendered as a disabled
// row that looked identical.

const entities = createDemoSeed(NOW)

function scope(id: string) {
  const viewModel = demoCollectionViewModel(entities, id, NOW)
  if (!viewModel) throw new Error(`missing demo scope ${id}`)
  return viewModel
}

beforeEach(() => {
  resetRouterCalls()
})

// A scope that holds cards of its own holds the shared delete mutation with
// them, which needs a client. Nothing here fires one.
function renderScope(viewModel: MobileCollectionViewModel) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <LibraryCollectionScreen viewModel={viewModel} />
    </QueryClientProvider>,
  )
}

describe('a collection that holds cards of its own', () => {
  // What promoting a deck produces: give a deck that already has cards a child,
  // and it becomes a Collection whose own cards would otherwise stop being
  // reachable from any screen while still being scheduled and still counting on
  // Today and Progress.
  const promoted = {
    ...entities,
    decks: [
      ...entities.decks,
      { ...entities.decks[0], id: 'test-child-deck', name: 'Child deck', parentId: 'fixture-modern-cpp' },
    ],
  }

  function promotedScope() {
    const viewModel = demoCollectionViewModel(promoted, 'fixture-modern-cpp', NOW)
    if (!viewModel) throw new Error('promoted deck is not a collection')
    return viewModel
  }

  it('lists them rather than dropping them out of the Library', () => {
    const viewModel = promotedScope()
    expect(viewModel.ownCards.length).toBeGreaterThan(0)

    renderScope(viewModel)

    expect(screen.getByText('Cards in Modern C++ & Memory')).toBeTruthy()
    for (const card of viewModel.ownCards) {
      expect(screen.getByText(card.prompt)).toBeTruthy()
    }
  })

  it('counts them, so the metric agrees with the list', () => {
    const viewModel = promotedScope()
    const childCards = viewModel.decks.reduce((total, deck) => total + deck.cardCount, 0)
    expect(viewModel.cardCount).toBe(childCards + viewModel.ownCards.length)
  })

  it('opens each of them, by that card s own id', () => {
    const viewModel = promotedScope()
    renderScope(viewModel)

    for (const card of viewModel.ownCards) {
      resetRouterCalls()
      fireEvent.press(screen.getByText(card.prompt))
      expect(pushedCardIds()).toEqual([card.id])
    }
  })

  it('says nothing about own cards on a collection that has none', () => {
    const viewModel = scope('fixture-languages-cpp')
    expect(viewModel.ownCards).toEqual([])

    renderScope(viewModel)

    expect(screen.queryByText(/^Cards in /)).toBeNull()
  })
})

describe('collection deck rows', () => {
  it('opens every deck, not just the one that used to be wired', () => {
    const viewModel = scope('fixture-languages-cpp')
    render(<LibraryCollectionScreen viewModel={viewModel} />)

    for (const deck of viewModel.decks) {
      resetRouterCalls()
      fireEvent.press(screen.getByText(deck.name))
      expect(pushedDeckIds()).toEqual([deck.id])
    }
  })

  it('works for a collection that has no hard-coded deck at all', () => {
    const viewModel = scope('fixture-systems')
    render(<LibraryCollectionScreen viewModel={viewModel} />)

    expect(viewModel.decks.length).toBeGreaterThan(0)
    fireEvent.press(screen.getByText(viewModel.decks[0].name))
    expect(pushedDeckIds()).toEqual([viewModel.decks[0].id])
  })

  it('renders the unfiled scope as a real destination', () => {
    const viewModel = scope('unfiled')
    render(<LibraryCollectionScreen viewModel={viewModel} />)

    expect(screen.getByText('Unfiled')).toBeTruthy()
    fireEvent.press(screen.getByText(viewModel.decks[0].name))
    expect(pushedDeckIds()).toEqual([viewModel.decks[0].id])
  })

  it('scopes its rows to its own decks', () => {
    const viewModel = scope('fixture-research')
    render(<LibraryCollectionScreen viewModel={viewModel} />)

    expect(screen.getByText('Compiler Research Papers')).toBeTruthy()
    expect(screen.queryByText('Modern C++ & Memory')).toBeNull()
  })
})

describe('collection sort', () => {
  it('starts on name, the default web uses outside All Decks', () => {
    render(<LibraryCollectionScreen viewModel={scope('fixture-languages-cpp')} />)
    expect(screen.getByText('Sort: Name')).toBeTruthy()
  })

  it('applies the sort it names', () => {
    const viewModel = scope('fixture-languages-cpp')
    render(<LibraryCollectionScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByLabelText('Sort: Name'))
    fireEvent.press(screen.getByText('Due soon'))

    expect(screen.getByText('Sort: Due soon')).toBeTruthy()

    const order = screen
      .getAllByHintText('Opens this deck')
      .map((row) => String(row.props.accessibilityLabel).split(',')[0])
    const byDue = [...viewModel.decks]
      .sort((a, b) => b.dueCount - a.dueCount)
      .map((deck) => deck.name)

    expect(order).toEqual(byDue)
  })
})

describe('deck creation', () => {
  it('creates inside this collection by passing its id as the parent', () => {
    // A collection IS a deck, so membership is parentId and nothing else.
    // There is no collectionId to set, which is exactly why a deck created here
    // shows up in the rail, in All Decks and in this list with no further
    // wiring.
    render(<LibraryCollectionScreen viewModel={scope('fixture-languages-cpp')} />)

    fireEvent.press(screen.getByLabelText('New Deck'))

    expect(routerCalls.push).toEqual([
      { pathname: '/deck/new', params: { parentId: 'fixture-languages-cpp' } },
    ])
  })
})

describe('controls that are not offered', () => {
  it('renders nothing for collection settings or an overflow menu', () => {
    // Collection management remains out of scope on this platform. Permanently
    // greyed controls under the metrics card made a working screen look
    // half-finished, so they are removed, not disabled.
    render(<LibraryCollectionScreen viewModel={scope('fixture-languages-cpp')} />)

    expect(screen.queryByText('Collection settings')).toBeNull()
    expect(screen.queryByLabelText('More unavailable')).toBeNull()
    expect(screen.UNSAFE_queryAllByProps({ disabled: true })).toHaveLength(0)
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
