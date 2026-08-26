import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoTodayViewModel } from '@/src/demo/demoSelectors'
import { createDemoSeed } from '@/src/demo/demoWorkspace'
import { pushedDeckIds, resetRouterCalls, routerCalls, routerDouble } from '@/src/test/routerDouble'
import { TodayScreen } from './TodayScreen'

// One fixed instant for the whole file: due-ness is a comparison against an
// instant, so a wall-clock read here would make these assertions time-dependent.
const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
  useFocusEffect: () => {},
}))

// Every Continue Learning row used to route to '/library' - the right gesture
// at the wrong destination, and the same destination for all of them.


// A fixed greeting, so these assertions do not depend on a random pick.
const DEMO_GREETING = { mainText: 'Ready to learn?', subtext: 'A demo greeting.' }

const entities = createDemoSeed(NOW)
const viewModel = demoTodayViewModel(entities, DEMO_GREETING, NOW)

beforeEach(() => {
  resetRouterCalls()
})

describe('Continue learning', () => {
  it('opens the deck the row is about', () => {
    render(<TodayScreen viewModel={viewModel} />)

    for (const deck of viewModel.decks) {
      resetRouterCalls()
      fireEvent.press(screen.getByLabelText(new RegExp(`^${deck.name.replace(/[+&]/g, '\\$&')},`)))
      expect(pushedDeckIds()).toEqual([deck.id])
    }
  })

  it('sends different rows to different decks', () => {
    render(<TodayScreen viewModel={viewModel} />)

    const rows = screen.getAllByHintText('Opens this deck')
    expect(rows.length).toBe(viewModel.decks.length)
    for (const row of rows) fireEvent.press(row)

    expect(new Set(pushedDeckIds()).size).toBe(viewModel.decks.length)
  })

  it('only lists decks that exist in the workspace', () => {
    const deckIds = new Set(entities.decks.map((deck) => deck.id))
    for (const deck of viewModel.decks) {
      expect(deckIds.has(deck.id)).toBe(true)
    }
  })

  it('keeps See all pointing at Library', () => {
    render(<TodayScreen viewModel={viewModel} />)
    fireEvent.press(screen.getByText('See all'))
    expect(routerCalls.push).toContain('/library')
  })

  it('says so when nothing is in progress instead of heading an empty list', () => {
    render(<TodayScreen viewModel={{ ...viewModel, decks: [] }} />)

    expect(screen.getByText(/Nothing in progress right now/)).toBeTruthy()
  })
})

describe('the hero action', () => {
  it('starts a session while cards are due', () => {
    expect(viewModel.dueToday).toBeGreaterThan(0)
    render(<TodayScreen viewModel={viewModel} />)

    fireEvent.press(screen.getByText('Start your next session'))

    expect(routerCalls.push).toContain('/review/session')
  })

  it('offers the library instead when nothing is due', () => {
    // No session can create due work, so the one action in the one slot changes
    // where it goes rather than opening a session that is over on arrival.
    render(<TodayScreen viewModel={{ ...viewModel, dueToday: 0 }} />)

    expect(screen.queryByText('Start your next session')).toBeNull()
    fireEvent.press(screen.getByText('Browse your library'))

    expect(routerCalls.push).toEqual(['/library'])
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
