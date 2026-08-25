import { render, screen } from '@testing-library/react-native'

import { routerDouble } from '@/src/test/routerDouble'
import { ProfileSettingsScreen } from './ProfileSettingsScreen'

// What Profile is allowed to advertise, per runtime mode.
//
// The seven settings rows are a cloud-mode surface. Six of them can only say
// "not available yet", and the seventh offers a backup this platform cannot
// perform - which on a build shown to prospective users reads as an unfinished
// product rather than as deferred scope. Demo mode therefore renders none of
// them; the cloud path is unchanged, and this file asserts both directions so
// the gate cannot be dropped in either.

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

// `mock`-prefixed so Jest's hoisting guard permits the reference in the factory.
// The runtime mode is a module constant resolved once from the environment, so
// it is replaced with a getter this file can move between cases.
let mockMode: 'demo' | 'cloud' = 'demo'
jest.mock('@/src/config/mobileRuntimeMode', () => ({
  get mobileRuntimeMode() {
    return mockMode
  },
  get isDemoMode() {
    return mockMode === 'demo'
  },
}))

jest.mock('@itera/core', () => ({
  ...jest.requireActual('@itera/core'),
  useAuth: () => ({
    mode: mockMode === 'demo' ? 'local' : 'supabase',
    session: null,
    loading: false,
    sessionError: null,
    identity: mockMode === 'demo' ? { kind: 'demo' } : { kind: 'supabase', email: 'a@b.test' },
    isAuthenticated: true,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}))

const SECTION_LABELS = [
  'Email & Password',
  'Appearance',
  'Notifications',
  'Privacy',
  'Connected Devices',
  'Import / Export',
]

describe('demo mode', () => {
  beforeEach(() => {
    mockMode = 'demo'
  })

  it('states what the workspace is, honestly and without an account', () => {
    render(<ProfileSettingsScreen />)

    expect(screen.getByText('Demo workspace')).toBeTruthy()
    expect(screen.getByText('Deterministic demo data. Not a synced account.')).toBeTruthy()
    expect(screen.getByText('Nothing here is saved between app launches')).toBeTruthy()
    // There is no account to sign out of.
    expect(screen.queryByText('Sign out')).toBeNull()
  })

  it('advertises none of the deferred settings infrastructure', () => {
    render(<ProfileSettingsScreen />)

    for (const label of SECTION_LABELS) {
      expect(screen.queryByText(label)).toBeNull()
    }
    expect(screen.queryByText(/Not available yet/)).toBeNull()
    expect(screen.queryByText('Export JSON')).toBeNull()
    expect(screen.queryByText('Import JSON')).toBeNull()
    expect(screen.queryByText('PLANNED')).toBeNull()
  })

  it('leaves no disabled or inert control on the screen', () => {
    // The Merge / Replace radio group was the one control here that responded
    // to a press and changed nothing, because the buttons above it could not
    // run. It went with the panel that held it.
    render(<ProfileSettingsScreen />)

    expect(screen.UNSAFE_queryAllByProps({ disabled: true })).toHaveLength(0)
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})

describe('cloud mode', () => {
  beforeEach(() => {
    mockMode = 'cloud'
  })

  it('keeps the intended settings structure intact', () => {
    render(<ProfileSettingsScreen />)

    for (const label of SECTION_LABELS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    // Import / Export is the section the screen opens on.
    expect(screen.getByText('Export JSON')).toBeTruthy()
    expect(screen.getByText('Sign out')).toBeTruthy()
    expect(screen.getByText('a@b.test')).toBeTruthy()
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
