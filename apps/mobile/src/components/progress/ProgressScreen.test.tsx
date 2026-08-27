import { fireEvent, render, screen } from '@testing-library/react-native'

import type { DateRangePreset } from '@itera/core'
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

// The range is the route's state, so a test that only renders the screen still
// has to supply one. `onChange` records what the screen asked for.
function renderScreen(preset: DateRangePreset = '30d') {
  const onRangePresetChange = jest.fn()
  render(
    <ProgressScreen
      onRangePresetChange={onRangePresetChange}
      rangePreset={preset}
      viewModel={demoProgressViewModel(entities, NOW, preset)}
    />,
  )
  return onRangePresetChange
}

beforeEach(() => {
  resetRouterCalls()
})

describe('Deck performance', () => {
  it('opens the deck each row is about', () => {
    renderScreen()

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

  it('offers every range it can report, and states the one it is reporting', () => {
    // The group used to be absent because two thirds of it could not be
    // honoured. All three windows are real now, and the date pill still names
    // the one every figure on the page is computed over.
    const onRangePresetChange = renderScreen()

    expect(screen.getByText('30D')).toBeTruthy()
    expect(screen.getByText('3M')).toBeTruthy()
    expect(screen.getByText('1Y')).toBeTruthy()
    expect(screen.getByText(viewModel.rangeLabel)).toBeTruthy()
    expect(screen.UNSAFE_queryAllByProps({ disabled: true })).toHaveLength(0)

    fireEvent.press(screen.getByText('3M'))
    expect(onRangePresetChange).toHaveBeenCalledWith('90d')
  })

  it('reports the range it was given, not one fixed window', () => {
    renderScreen('1y')

    const yearly = demoProgressViewModel(entities, NOW, '1y')
    expect(screen.getByText(yearly.rangeLabel)).toBeTruthy()
    expect(screen.getByText('Last 12 months')).toBeTruthy()
    expect(yearly.activityDays).toHaveLength(365)
    // A month is still bucketed a day at a time; a year is not, because 365
    // buckets draw segments narrower than the line drawing them.
    expect(demoProgressViewModel(entities, NOW, '30d').retentionSeries).toHaveLength(30)
    expect(yearly.retentionSeries.length).toBeLessThan(45)
  })

  it('labels every activity cell with the day it stands for', () => {
    renderScreen()

    const today = viewModel.activityDays.at(-1)
    expect(today).toBeDefined()
    expect(
      screen.getByLabelText(
        `Today, ${today!.count} ${today!.count === 1 ? 'review' : 'reviews'}`,
      ),
    ).toBeTruthy()
    // Weekday rows are what make the grid readable as a calendar.
    expect(screen.getByText('Mon')).toBeTruthy()
  })

  it('renders isolated retention buckets as points without bridging gaps', () => {
    renderScreen()
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
