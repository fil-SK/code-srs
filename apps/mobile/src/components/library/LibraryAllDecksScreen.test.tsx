import { leafDecks } from '@itera/core'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoLibraryViewModel } from '@/src/demo/demoSelectors'
import { createDemoSeed } from '@/src/demo/demoWorkspace'
import {
  pushedCollectionIds,
  pushedDeckIds,
  resetRouterCalls,
  routerCalls,
  routerDouble,
} from '@/src/test/routerDouble'
import { LibraryAllDecksScreen } from './LibraryAllDecksScreen'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

// The audit's worst visible defect was here: All Decks rows were rendered as a
// plain View with no press handler at all, so the only way to reach a deck
// screen in the whole app was one hard-coded row on the Collection screen.

const entities = createDemoSeed(NOW)
const viewModel = demoLibraryViewModel(entities, NOW)

beforeEach(() => {
  resetRouterCalls()
})

function rowFor(name: string) {
  return screen.getByLabelText(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`))
}

/**
 * The deck names in the order the screen actually rendered them.
 *
 * Read from the tree rather than inferred from the order rows are pressed in:
 * pressing rows by name records the loop's order whatever the list did, which
 * would make a sort assertion prove nothing.
 */
function renderedDeckNames(): string[] {
  return screen
    .getAllByHintText('Opens this deck')
    .map((row) => String(row.props.accessibilityLabel).split(',')[0])
}

describe('All Decks rows', () => {
  it('opens each deck at its own id', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    for (const deck of viewModel.decks) {
      resetRouterCalls()
      fireEvent.press(rowFor(deck.name))
      expect(pushedDeckIds()).toEqual([deck.id])
    }
  })

  it('sends different rows to different decks', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    fireEvent.press(rowFor('Modern C++ & Memory'))
    fireEvent.press(rowFor('Security Engineering'))

    const [first, second] = pushedDeckIds()
    expect(first).toBe('fixture-modern-cpp')
    expect(second).toBe('fixture-security-engineering')
    expect(first).not.toBe(second)
  })

  it('reaches every browsable deck from this one screen', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)
    for (const deck of viewModel.decks) fireEvent.press(rowFor(deck.name))

    // Leaves, not every deck row: the four collections are decks with children,
    // and a collection is a scope rather than a Library row.
    expect(new Set(pushedDeckIds())).toEqual(
      new Set(leafDecks(entities.decks).map((deck) => deck.id)),
    )
  })
})

describe('collection scopes', () => {
  it('opens every scope except the one already on screen', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    for (const collection of viewModel.collections) {
      if (collection.kind === 'all') continue
      fireEvent.press(screen.getByLabelText('Open ' + collection.name))
    }

    // "All Decks" is the current scope and navigates nowhere; everything else
    // resolves, including the two that used to be disabled.
    expect(pushedCollectionIds()).toEqual(
      viewModel.collections.filter((c) => c.kind !== 'all').map((c) => c.id),
    )
  })
})

describe('sort', () => {
  it('reports the sort that is actually applied', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)
    expect(screen.getByText('Sort: Last studied')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Sort: Last studied'))
    fireEvent.press(screen.getByText('Name'))

    expect(screen.getByLabelText('Sort: Name')).toBeTruthy()
    expect(screen.getByText('Sort: Name')).toBeTruthy()
    expect(screen.queryByText('Sort: Last studied')).toBeNull()
  })

  it('reorders the list to match the label', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    const byLastStudied = renderedDeckNames()

    fireEvent.press(screen.getByLabelText('Sort: Last studied'))
    fireEvent.press(screen.getByText('Name'))
    const byName = renderedDeckNames()

    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)))
    expect(byName).not.toEqual(byLastStudied)

    fireEvent.press(screen.getByLabelText('Sort: Name'))
    fireEvent.press(screen.getByText('Card count'))
    expect(renderedDeckNames()).not.toEqual(byName)
    expect(screen.getByText('Sort: Card count')).toBeTruthy()
  })

  it('starts on the same default web uses for All Decks', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    const studied = viewModel.decks
      .filter((deck) => deck.lastStudiedAt !== undefined)
      .sort((a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0))
      .map((deck) => deck.name)

    expect(renderedDeckNames().slice(0, studied.length)).toEqual(studied)
  })
})

describe('filter and search', () => {
  it('hides decks with nothing due when Due only is checked', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)
    expect(screen.queryByText('Security Engineering')).toBeTruthy()

    fireEvent.press(screen.getByText('Due only'))

    expect(screen.queryByText('Security Engineering')).toBeNull()
    expect(screen.queryByText('Modern C++ & Memory')).toBeTruthy()
  })

  it('searches over the workspace and shows an empty state when nothing matches', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    fireEvent.changeText(screen.getByLabelText('Search decks'), 'compilers')
    expect(screen.queryByText('Compilers & MLIR')).toBeTruthy()
    expect(screen.queryByText('Security Engineering')).toBeNull()

    fireEvent.changeText(screen.getByLabelText('Search decks'), 'zzzz')
    expect(screen.getByText('No matching decks')).toBeTruthy()
  })

  it('offers a way out of a search, and it is not there when there is nothing to clear', () => {
    // `clearButtonMode` is iOS-only, so on Android the only way back to the
    // unfiltered list was to delete the query one character at a time.
    render(<LibraryAllDecksScreen viewModel={viewModel} />)
    expect(screen.queryByLabelText('Clear deck search')).toBeNull()

    fireEvent.changeText(screen.getByLabelText('Search decks'), 'compilers')
    expect(screen.queryByText('Security Engineering')).toBeNull()

    fireEvent.press(screen.getByLabelText('Clear deck search'))

    expect(screen.getByLabelText('Search decks').props.value).toBe('')
    expect(screen.getByText('Security Engineering')).toBeTruthy()
    expect(screen.queryByLabelText('Clear deck search')).toBeNull()
  })
})

describe('deck creation', () => {
  it('offers New Deck and opens the create form with no parent', () => {
    // All Decks creates at the top level, which is the hierarchy web's own All
    // Decks action uses: no parentId. Creating inside a collection is the
    // Collection screen's action, and the only difference is the parent.
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByLabelText('New Deck'))

    expect(routerCalls.push).toEqual(['/deck/new'])
  })
})

describe('controls that are not offered', () => {
  it('renders nothing for import or an all-collections view', () => {
    // Backup remains deferred product scope on this platform, not pending
    // work, so the screen carries no permanently greyed control for it - a
    // disabled primary action makes a finished screen look broken.
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    expect(screen.queryByText('Import')).toBeNull()
    expect(screen.queryByLabelText('All collections unavailable')).toBeNull()

    // The decorative Filter control is gone: web's entire filter menu is the
    // Due only checkbox, which this screen already has.
    expect(screen.queryByText('Filter')).toBeNull()
  })

  it('leaves no disabled control anywhere on the screen', () => {
    render(<LibraryAllDecksScreen viewModel={viewModel} />)

    // The one legitimate disabled state on this screen is the collection pill
    // for the scope already open, which is a selected tab rather than an
    // unavailable action.
    const disabled = screen
      .UNSAFE_queryAllByProps({ disabled: true })
      .filter((node) => node.props.accessibilityState?.selected !== true)
    expect(disabled).toHaveLength(0)
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
