import { cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { ReviewStartScreen } from './ReviewStartScreen'

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

afterEach(cleanup)

// The Review tab's entry surface. Deliberately small: due count, scope, one
// action, and an honest caught-up state. If an assertion here starts needing a
// chart or a filter, the screen has grown past what it is for.

describe('the Review start screen', () => {
  it('uses the same prominent page-title scale as the other primary tabs', () => {
    render(<ReviewStartScreen deckNames={[]} dueCount={0} onStart={() => {}} />)

    expect(StyleSheet.flatten(screen.getByText('Review').props.style)).toMatchObject({
      fontSize: 34,
      fontWeight: '700',
    })
  })

  it('states how much is due', () => {
    render(<ReviewStartScreen deckNames={['Modern C++ & Memory']} dueCount={7} onStart={() => {}} />)

    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('cards due')).toBeTruthy()
  })

  it('says card, not cards, for one', () => {
    render(<ReviewStartScreen deckNames={[]} dueCount={1} onStart={() => {}} />)
    expect(screen.getByText('card due')).toBeTruthy()
  })

  it('names the contributing decks', () => {
    render(
      <ReviewStartScreen
        deckNames={['Modern C++ & Memory', 'Compilers & MLIR']}
        dueCount={4}
        onStart={() => {}}
      />,
    )

    expect(screen.getByText('Modern C++ & Memory · Compilers & MLIR')).toBeTruthy()
  })

  it('abbreviates a long deck list rather than wrapping four deep', () => {
    render(<ReviewStartScreen deckNames={['A', 'B', 'C', 'D', 'E']} dueCount={9} onStart={() => {}} />)

    expect(screen.getByText('A · B · C · +2 more')).toBeTruthy()
  })

  it('starts a session on the primary action', () => {
    const started = { count: 0 }
    render(
      <ReviewStartScreen
        deckNames={['Algorithms']}
        dueCount={3}
        onStart={() => {
          started.count += 1
        }}
      />,
    )

    fireEvent.press(screen.getByLabelText('Start session, 3 cards due'))
    expect(started.count).toBe(1)
  })

  it('shows an honest caught-up state, with nothing to start', () => {
    render(<ReviewStartScreen deckNames={[]} dueCount={0} onStart={() => {}} />)

    expect(screen.getByText('All caught up')).toBeTruthy()
    expect(screen.queryByText('Start session')).toBeNull()
  })
})
