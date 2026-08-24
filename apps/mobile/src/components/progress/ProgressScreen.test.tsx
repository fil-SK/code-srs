import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoProgressViewModel } from '@/src/demo/demoSelectors'
import { createDemoWorkspace } from '@/src/demo/demoWorkspace'
import { pushedDeckIds, resetRouterCalls, routerDouble } from '@/src/test/routerDouble'
import { ProgressScreen } from './ProgressScreen'

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

// Deck performance rows looked like a list of links and were plain Views.

const workspace = createDemoWorkspace()
const viewModel = demoProgressViewModel(workspace)

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
    const deckIds = new Set(workspace.decks.map((deck) => deck.id))
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
    expect(viewModel.decks.some((deck) => !deck.retentionKnown)).toBe(true)
  })

  it('keeps the unimplemented range options visibly unavailable', () => {
    render(<ProgressScreen viewModel={viewModel} />)

    for (const range of ['3M', '1Y']) {
      const control = screen.getByLabelText(range + ' range unavailable')
      expect(control.props.accessibilityState?.disabled).toBe(true)
    }
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
