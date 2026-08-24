import type { AuthValue } from '@itera/core'
import { render, screen } from '@testing-library/react-native'

import { RootNavigator } from './RootNavigator'

// The router is replaced with a transparent double that renders each screen's
// name and honours the guard, so what is asserted is this module's decision
// rather than Expo Router's implementation of it.
jest.mock('expo-router', () => {
  // require, not import: a jest.mock factory is hoisted above the imports, so
  // module-scope bindings do not exist yet when it runs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText } = require('react-native')

  function Stack({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }
  function Screen({ name }: { name: string }) {
    return <RNText>{`screen:${name}`}</RNText>
  }
  function Protected({ guard, children }: { guard: boolean; children: React.ReactNode }) {
    return guard ? <>{children}</> : null
  }
  Stack.Screen = Screen
  Stack.Protected = Protected

  return { Stack }
})

// `mock`-prefixed so Jest's hoisting guard permits the reference inside the
// factory below.
const mockUseAuth = jest.fn()
jest.mock('@itera/core', () => ({
  ...jest.requireActual('@itera/core'),
  useAuth: () => mockUseAuth(),
}))

function auth(overrides: Partial<AuthValue>): void {
  mockUseAuth.mockReturnValue({
    mode: 'supabase',
    session: null,
    loading: false,
    sessionError: null,
    identity: null,
    isAuthenticated: false,
    email: undefined,
    signInLocal: jest.fn(),
    signInDemo: jest.fn(),
    signOut: jest.fn(),
    ...overrides,
  })
}

describe('RootNavigator', () => {
  it('renders no navigator at all while the session bootstrap is running', () => {
    auth({ loading: true })
    render(<RootNavigator />)

    expect(screen.getByText('Signing you in…')).toBeTruthy()
    // The important half: neither group is mounted, so there is no frame in
    // which the wrong screen is visible before the decision lands.
    expect(screen.queryByText('screen:(app)')).toBeNull()
    expect(screen.queryByText('screen:(auth)')).toBeNull()
  })

  it('exposes only the auth group when signed out', () => {
    auth({ loading: false, isAuthenticated: false })
    render(<RootNavigator />)

    expect(screen.getByText('screen:(auth)')).toBeTruthy()
    expect(screen.queryByText('screen:(app)')).toBeNull()
  })

  it('exposes only the app group when signed in', () => {
    auth({ loading: false, isAuthenticated: true })
    render(<RootNavigator />)

    expect(screen.getByText('screen:(app)')).toBeTruthy()
    expect(screen.queryByText('screen:(auth)')).toBeNull()
  })

  it('keeps protected content unreachable after a failed bootstrap', () => {
    // A bootstrap that errored is signed out, not signed in. Rendering the app
    // group here would be audit P1-3 on a new platform.
    auth({ loading: false, isAuthenticated: false, sessionError: 'Could not reach the service.' })
    render(<RootNavigator />)

    expect(screen.getByText('screen:(auth)')).toBeTruthy()
    expect(screen.queryByText('screen:(app)')).toBeNull()
  })

  it('withdraws the app group when a session ends', () => {
    auth({ loading: false, isAuthenticated: true })
    const view = render(<RootNavigator />)
    expect(screen.getByText('screen:(app)')).toBeTruthy()

    auth({ loading: false, isAuthenticated: false })
    view.rerender(<RootNavigator />)

    expect(screen.queryByText('screen:(app)')).toBeNull()
    expect(screen.getByText('screen:(auth)')).toBeTruthy()
  })

  it('always keeps the entry redirect mounted', () => {
    auth({ loading: false, isAuthenticated: false })
    render(<RootNavigator />)
    expect(screen.getByText('screen:index')).toBeTruthy()
  })
})
