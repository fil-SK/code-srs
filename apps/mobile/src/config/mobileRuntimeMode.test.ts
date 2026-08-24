// The mode is a module-scope constant resolved from the environment once, so
// every case re-imports the module under a different environment. That is also
// what happens in a real build: Expo inlines the value and it never changes
// afterwards.

function modeFor(value: string | undefined): string {
  const previous = process.env.EXPO_PUBLIC_ITERA_MODE
  if (value === undefined) delete process.env.EXPO_PUBLIC_ITERA_MODE
  else process.env.EXPO_PUBLIC_ITERA_MODE = value

  let mode = ''
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mode = require('./mobileRuntimeMode').mobileRuntimeMode
  })

  if (previous === undefined) delete process.env.EXPO_PUBLIC_ITERA_MODE
  else process.env.EXPO_PUBLIC_ITERA_MODE = previous

  return mode
}

describe('mobileRuntimeMode', () => {
  it('defaults to demo, so a build with no configuration opens the product', () => {
    expect(modeFor(undefined)).toBe('demo')
  })

  it('opts in to cloud only on the exact value', () => {
    expect(modeFor('cloud')).toBe('cloud')
  })

  it('never infers cloud from anything else', () => {
    // The point of the default: a half-configured or mistyped build is a demo
    // build, not a cloud build that will start reaching for credentials.
    for (const value of ['', 'demo', 'Cloud', 'CLOUD', 'production', 'true', 'supabase']) {
      expect(modeFor(value)).toBe('demo')
    }
  })
})
