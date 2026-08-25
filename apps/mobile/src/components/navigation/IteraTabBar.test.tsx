import { cleanup, render, screen } from '@testing-library/react-native'
import type { ComponentProps, ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { IteraTabBar } from './IteraTabBar'

// The bar reads the safe-area inset, which needs a provider with real metrics
// under the test renderer.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

function renderBar(element: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>)
}

// The immersive-session rule: no persistent navigation while a card is on
// screen, and ordinary navigation everywhere else - including the Review tab's
// own start screen, which used to be hidden along with the session.

afterEach(cleanup)

type TabBarProps = ComponentProps<typeof IteraTabBar>

const TAB_NAMES = ['library', 'review', 'today', 'progress', 'profile']

function tabBarProps(focusedTab: string, nestedRoute?: string): TabBarProps {
  const index = TAB_NAMES.indexOf(focusedTab)
  const routes = TAB_NAMES.map((name) => ({
    key: `${name}-key`,
    name,
    ...(name === focusedTab && nestedRoute
      ? { state: { index: 0, routes: [{ key: `${nestedRoute}-key`, name: nestedRoute }] } }
      : {}),
  }))

  return {
    state: { index, routes },
    descriptors: Object.fromEntries(
      routes.map((route) => [
        route.key,
        { options: { title: route.name[0].toUpperCase() + route.name.slice(1) } },
      ]),
    ),
    navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => {} },
  } as unknown as TabBarProps
}

describe('the persistent tab bar', () => {
  it('is visible on an ordinary section', () => {
    renderBar(<IteraTabBar {...tabBarProps('today')} />)
    expect(screen.getByLabelText('Today')).toBeTruthy()
  })

  it('is visible on the Review tab s start screen', () => {
    renderBar(<IteraTabBar {...tabBarProps('review', 'index')} />)
    expect(screen.getByLabelText('Review')).toBeTruthy()
  })

  it('is visible on the Review tab before its nested navigator has mounted', () => {
    // No nested state yet means the tab's initial route - the start screen.
    renderBar(<IteraTabBar {...tabBarProps('review')} />)
    expect(screen.getByLabelText('Review')).toBeTruthy()
  })

  it('is hidden during an active card session', () => {
    renderBar(<IteraTabBar {...tabBarProps('review', 'session')} />)
    for (const tab of ['Library', 'Review', 'Today', 'Progress', 'Profile']) {
      expect(screen.queryByLabelText(tab)).toBeNull()
    }
  })
})
