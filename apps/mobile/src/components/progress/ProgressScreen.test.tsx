import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoProgressViewModel } from '@/src/demo/demoSelectors'
import { createDemoSeed } from '@/src/demo/demoWorkspace'
import { pushedDeckIds, resetRouterCalls, routerDouble } from '@/src/test/routerDouble'
import { ProgressScreen } from './ProgressScreen'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

// Deck performance rows looked like a list of links and were plain Views.

const entities = createDemoSeed(NOW)
const viewModel = demoProgressViewModel(entities, NOW)

beforeEach(() => {
  resetRouterCalls()
})

describe('Deck performance', () => {
  it('opens the deck each row is about', () => {
    render(<ProgressScreen viewModel={viewModel} />)

    for (const deck of viewModel.decks) {
      resetRouterCalls()
      fireEvent.press(screen.getByText(deck.name))
      expect(pushedDeckIds()).toEqual([deck.id])
    }
  })

  it('lists only decks that exist in the workspace', () => {
    const deckIds = new Set(entities.decks.map((deck) => deck.id))
    expect(viewModel.decks.length).toBeGreaterThan(0)
    for (const deck of viewModel.decks) {
      expect(deckIds.has(deck.id)).toBe(true)
    }
  })

  it('marks a real retention figure as such without sniffing the label text', () => {
    // The success colour used to be chosen by testing whether the label started
    // with '89', which would have been wrong for any other deck reaching it.
    for (const deck of viewModel.decks) {
      expect(deck.retentionKnown).toBe(deck.retentionLabel !== 'Not enough data')
    }
    expect(viewModel.decks.some((deck) => deck.retentionKnown)).toBe(true)
  })

  it('offers no range control, and states the range it actually reports', () => {
    // Progress reports one real window. The three-button group implied a choice
    // that two thirds of it could not honour, so it is gone; the date pill
    // already names the window every figure on the page is computed over.
    render(<ProgressScreen viewModel={viewModel} />)

    expect(screen.queryByText('30D')).toBeNull()
    expect(screen.queryByText('3M')).toBeNull()
    expect(screen.queryByText('1Y')).toBeNull()
    expect(screen.getByText(viewModel.rangeLabel)).toBeTruthy()
    expect(screen.UNSAFE_queryAllByProps({ disabled: true })).toHaveLength(0)
  })

  it('renders isolated retention buckets as points without bridging gaps', () => {
    render(<ProgressScreen viewModel={viewModel} />)
    fireEvent(
      screen.getByLabelText('Retention over time chart'),
      'layout',
      { nativeEvent: { layout: { width: 320, height: 116, x: 0, y: 0 } } },
    )

    expect(screen.getAllByLabelText(/Isolated retention observation/).length).toBeGreaterThan(0)
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
