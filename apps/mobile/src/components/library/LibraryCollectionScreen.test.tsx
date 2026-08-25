import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoCollectionViewModel } from '@/src/demo/demoSelectors'
import { createDemoWorkspace } from '@/src/demo/demoWorkspace'
import { pushedDeckIds, resetRouterCalls, routerDouble } from '@/src/test/routerDouble'
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

const workspace = createDemoWorkspace(NOW)

function scope(id: string) {
  const viewModel = demoCollectionViewModel(workspace, id, NOW)
  if (!viewModel) throw new Error(`missing demo scope ${id}`)
  return viewModel
}

beforeEach(() => {
  resetRouterCalls()
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

describe('controls that are not offered', () => {
  it('renders nothing for deck creation, collection settings or an overflow menu', () => {
    // Deck and collection management are deferred product scope on this
    // platform. Three permanently greyed controls under the metrics card made a
    // working screen look half-finished, so they are removed, not disabled.
    render(<LibraryCollectionScreen viewModel={scope('fixture-languages-cpp')} />)

    expect(screen.queryByText('New Deck')).toBeNull()
    expect(screen.queryByText('Collection settings')).toBeNull()
    expect(screen.queryByLabelText('More unavailable')).toBeNull()
    expect(screen.UNSAFE_queryAllByProps({ disabled: true })).toHaveLength(0)
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
