import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoDeckViewModel } from '@/src/demo/demoSelectors'
import { createDemoWorkspace } from '@/src/demo/demoWorkspace'
import { resetRouterCalls, routerDouble } from '@/src/test/routerDouble'
import { LibraryDeckScreen } from './LibraryDeckScreen'
import { LibraryNotFoundScreen } from './LibraryNotFoundScreen'

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

const workspace = createDemoWorkspace()

function deck(id: string) {
  const viewModel = demoDeckViewModel(workspace, id)
  if (!viewModel) throw new Error(`missing demo deck ${id}`)
  return viewModel
}

beforeEach(() => {
  resetRouterCalls()
})

describe('deck identity', () => {
  it('shows the deck the route asked for, not a hard-coded one', () => {
    // The route used to hand deckId to a factory that always returned Modern
    // C++, so this is the case the whole screen used to get wrong.
    render(<LibraryDeckScreen viewModel={deck('fixture-compilers')} />)

    expect(screen.getByText('Compilers & MLIR')).toBeTruthy()
    expect(screen.queryByText('Modern C++ & Memory')).toBeNull()
  })

  it('counts the cards it actually lists', () => {
    const viewModel = deck('fixture-algorithms')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    expect(screen.getByText(String(viewModel.cardCount))).toBeTruthy()
    expect(viewModel.cardCount).toBe(viewModel.cards.length)
  })

  it('names the deck s own collection on the back control', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-security-engineering')} />)
    expect(screen.getByLabelText('Back to Unfiled')).toBeTruthy()
  })

  it('says so when a demo deck has no cards, rather than looking broken', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-leetcode-patterns')} />)
    expect(screen.getByText('No cards yet')).toBeTruthy()
  })
})

describe('not found', () => {
  it('offers an honest state for an id that names nothing', () => {
    render(
      <LibraryNotFoundScreen
        detail="This link points at a deck that is not part of the demo workspace."
        title="Deck not found"
      />,
    )

    expect(screen.getByText('Deck not found')).toBeTruthy()
    expect(screen.getByLabelText('Back to Library')).toBeTruthy()
  })
})

describe('card search and filter', () => {
  it('searches this deck s cards', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)

    fireEvent.changeText(screen.getByLabelText('Search cards'), 'RAII')

    expect(screen.getByText('Which statements are consequences of RAII?')).toBeTruthy()
    expect(screen.queryByText('Trace the ownership and lifetime in this move sequence')).toBeNull()
  })

  it('shows every card until a filter is chosen', () => {
    const viewModel = deck('fixture-modern-cpp')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    // It used to open with newOnly already true, hiding cards behind a filter
    // nobody had picked and a chip that could not be produced any other way.
    expect(screen.queryByText('Status: New')).toBeNull()
    for (const card of viewModel.cards) {
      expect(screen.getByText(card.prompt)).toBeTruthy()
    }
  })

  it('really filters by status, and the chip reflects the choice', () => {
    const viewModel = deck('fixture-modern-cpp')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByLabelText('Filter cards'))
    fireEvent.press(screen.getByLabelText('Show Learning cards'))

    expect(screen.getByText('Status: Learning')).toBeTruthy()
    for (const card of viewModel.cards) {
      if (card.status === 'Learning') expect(screen.getByText(card.prompt)).toBeTruthy()
      else expect(screen.queryByText(card.prompt)).toBeNull()
    }
  })

  it('clears the filter from the chip', () => {
    const viewModel = deck('fixture-modern-cpp')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByLabelText('Filter cards'))
    fireEvent.press(screen.getByLabelText('Show Review cards'))
    expect(screen.getByText('Status: Review')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Remove status filter'))

    expect(screen.queryByText('Status: Review')).toBeNull()
    for (const card of viewModel.cards) {
      expect(screen.getByText(card.prompt)).toBeTruthy()
    }
  })

  it('empties honestly when a search matches nothing', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)
    fireEvent.changeText(screen.getByLabelText('Search cards'), 'zzzz')
    expect(screen.getByText('No matching cards')).toBeTruthy()
  })
})

describe('removed and unavailable controls', () => {
  it('no longer offers a favorite toggle', () => {
    // Mobile-only, local-only, and with no web equivalent or product decision
    // behind it. Removed rather than kept as an invented feature.
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)

    expect(screen.queryByLabelText('Add to favorites')).toBeNull()
    expect(screen.queryByLabelText('Remove from favorites')).toBeNull()
  })

  it('keeps out-of-scope deck actions visibly unavailable', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)

    const actions = screen.getByLabelText('Deck actions unavailable')
    expect(actions.props.accessibilityState?.disabled).toBe(true)
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
