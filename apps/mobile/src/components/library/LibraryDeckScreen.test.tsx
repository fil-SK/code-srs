import { fireEvent, render, screen, within } from '@testing-library/react-native'

import { demoDeckViewModel } from '@/src/demo/demoSelectors'
import { createDemoWorkspace } from '@/src/demo/demoWorkspace'
import {
  pushedCardIds,
  pushedSessionDeckIds,
  resetRouterCalls,
  routerCalls,
  routerDouble,
} from '@/src/test/routerDouble'
import { LibraryDeckScreen } from './LibraryDeckScreen'
import { LibraryNotFoundScreen } from './LibraryNotFoundScreen'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

const workspace = createDemoWorkspace(NOW)

function deck(id: string) {
  const viewModel = demoDeckViewModel(workspace, id, NOW)
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

  it('does not promise a destination the back control will not reach', () => {
    // The row returns to whatever pushed the deck - All Decks, a collection,
    // Today, Progress or a notification - so it cannot name one of them. The
    // collection is still stated, as context in the identity block.
    render(<LibraryDeckScreen viewModel={deck('fixture-security-engineering')} />)

    expect(screen.getByLabelText('Back')).toBeTruthy()
    expect(screen.queryByLabelText('Back to Unfiled')).toBeNull()
    expect(screen.getByText('Unfiled')).toBeTruthy()
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
        detail="This link points at a deck that no longer exists."
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

describe('opening a card', () => {
  it('opens the card each row names, by that card s own id', () => {
    const viewModel = deck('fixture-modern-cpp')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    // Every row, not a sample: the failure this replaces was a list of rows
    // that all resolved to the same thing.
    for (const card of viewModel.cards) {
      fireEvent.press(screen.getByLabelText(new RegExp(`^${escapeForLabel(card.prompt)},`)))
    }

    expect(pushedCardIds()).toEqual(viewModel.cards.map((card) => card.id))
  })

  it('opens cards from different decks as different cards', () => {
    const cpp = deck('fixture-modern-cpp').cards[0]
    const compilers = deck('fixture-compilers').cards[0]

    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)
    fireEvent.press(screen.getByLabelText(new RegExp(`^${escapeForLabel(cpp.prompt)},`)))
    screen.unmount()

    render(<LibraryDeckScreen viewModel={deck('fixture-compilers')} />)
    fireEvent.press(screen.getByLabelText(new RegExp(`^${escapeForLabel(compilers.prompt)},`)))

    expect(pushedCardIds()).toEqual([cpp.id, compilers.id])
    expect(cpp.id).not.toBe(compilers.id)
  })

  it('opens the right card from a filtered list, and keeps the search', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)
    const search = screen.getByLabelText('Search cards')

    fireEvent.changeText(search, 'RAII')
    fireEvent.press(screen.getByLabelText(/^Which statements are consequences of RAII\?,/))

    expect(pushedCardIds()).toEqual(['fixture-card-raii'])
    // Opening a row is a push, not a reset: the deck stays as the learner left
    // it, so coming back lands on the same filtered list.
    expect(search.props.value).toBe('RAII')
  })

  it('opens the right card from a status-filtered list, and keeps the filter', () => {
    const viewModel = deck('fixture-modern-cpp')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByLabelText('Filter cards'))
    fireEvent.press(screen.getByLabelText('Show New cards'))
    const shown = viewModel.cards.filter((card) => card.status === 'New')
    expect(shown.length).toBeGreaterThan(0)
    fireEvent.press(screen.getByLabelText(new RegExp(`^${escapeForLabel(shown[0].prompt)},`)))

    expect(pushedCardIds()).toEqual([shown[0].id])
    expect(screen.getByText('Status: New')).toBeTruthy()
  })
})

describe('Study Now', () => {
  it('starts a session scoped to this deck', () => {
    const viewModel = deck('fixture-modern-cpp')
    expect(viewModel.dueCount).toBeGreaterThan(0)
    render(<LibraryDeckScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByLabelText(/^Study now,/))

    expect(pushedSessionDeckIds()).toEqual([viewModel.id])
  })

  it('says the deck is caught up instead of starting an empty session', () => {
    // fixture-computer-networks has no cards at all, which is one honest way to
    // have nothing due. Nothing is rescheduled to avoid this state.
    const viewModel = deck('fixture-computer-networks')
    expect(viewModel.dueCount).toBe(0)
    render(<LibraryDeckScreen viewModel={viewModel} />)

    expect(screen.queryByLabelText(/^Study now,/)).toBeNull()
    expect(screen.getByText('No cards to study yet.')).toBeTruthy()
    expect(routerCalls.push).toEqual([])
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

  it('no longer draws a kebab inside a card row', () => {
    // Decorative inside a dead row, deceptive inside a live one: tapping it
    // would open the card rather than a menu that does not exist.
    const viewModel = deck('fixture-modern-cpp')
    render(<LibraryDeckScreen viewModel={viewModel} />)

    expect(viewModel.cards.length).toBeGreaterThan(1)
    for (const card of viewModel.cards) {
      const row = within(screen.getByLabelText(new RegExp(`^${escapeForLabel(card.prompt)},`)))
      expect(row.UNSAFE_queryAllByProps({ name: 'dots-horizontal' })).toHaveLength(0)
      expect(row.UNSAFE_queryAllByProps({ name: 'chevron-right' }).length).toBeGreaterThan(0)
    }
  })

  it('no longer offers an Insights tab', () => {
    // It was a placeholder that said so. The deck's own metrics above the card
    // list are the real per-deck numbers, and a second per-deck analytics
    // surface exists on neither platform.
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)

    expect(screen.queryByText('Insights')).toBeNull()
    expect(screen.queryByText('Deck insights are not built yet')).toBeNull()
    expect(screen.getByText('Cards')).toBeTruthy()
  })

  it('offers no deck actions or add-card control, disabled or otherwise', () => {
    render(<LibraryDeckScreen viewModel={deck('fixture-modern-cpp')} />)

    expect(screen.queryByLabelText('Deck actions unavailable')).toBeNull()
    expect(screen.queryByLabelText('Add card unavailable')).toBeNull()
    expect(screen.UNSAFE_queryAllByProps({ disabled: true })).toHaveLength(0)
  })
})

/** Card prompts are real content and carry regex metacharacters. */
function escapeForLabel(prompt: string): string {
  return prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
