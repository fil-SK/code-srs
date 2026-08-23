// The registry is module state, and module state is exactly what these tests
// must not share. Each case re-imports the module through vi.resetModules() so
// it starts unconfigured, which is also why the production surface has no
// reset export: the isolation a test needs is the module loader's job, not an
// API that would let application code un-configure storage at runtime.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repository } from './repository'

type Registry = typeof import('./registry')

async function freshRegistry(): Promise<Registry> {
  vi.resetModules()
  return import('./registry')
}

// Only identity matters here, so a branded object is a truer double than a
// half-implemented Repository: nothing in the registry reads a member.
function fakeRepository(label: string): Repository {
  return { label } as unknown as Repository
}

let registry: Registry

beforeEach(async () => {
  registry = await freshRegistry()
})

describe('getRepository before configuration', () => {
  it('throws rather than defaulting to a backend', () => {
    expect(() => registry.getRepository()).toThrow(/configureRepository/)
  })

  it('keeps throwing, so a missed boot call cannot be masked by a retry', () => {
    expect(() => registry.getRepository()).toThrow()
    expect(() => registry.getRepository()).toThrow()
  })
})

describe('configuration', () => {
  it('does not call the factory, so importing a boot module opens no database', () => {
    const create = vi.fn(() => fakeRepository('a'))
    registry.configureRepository(create)
    expect(create).not.toHaveBeenCalled()
  })

  it('constructs on first use', () => {
    const repo = fakeRepository('a')
    const create = vi.fn(() => repo)
    registry.configureRepository(create)

    expect(registry.getRepository()).toBe(repo)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('returns the same instance every time and runs the factory once', () => {
    const create = vi.fn(() => fakeRepository('a'))
    registry.configureRepository(create)

    const first = registry.getRepository()
    const second = registry.getRepository()
    const third = registry.getRepository()

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(create).toHaveBeenCalledTimes(1)
  })
})

describe('reconfiguration', () => {
  it('drops the cached instance instead of serving the previous backend', () => {
    const first = fakeRepository('first')
    const second = fakeRepository('second')

    registry.configureRepository(() => first)
    expect(registry.getRepository()).toBe(first)

    registry.configureRepository(() => second)
    expect(registry.getRepository()).toBe(second)
  })

  it('stays lazy on the new factory too', () => {
    registry.configureRepository(() => fakeRepository('first'))
    registry.getRepository()

    const create = vi.fn(() => fakeRepository('second'))
    registry.configureRepository(create)
    expect(create).not.toHaveBeenCalled()

    registry.getRepository()
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('does not re-run the previous factory after replacement', () => {
    const firstFactory = vi.fn(() => fakeRepository('first'))
    registry.configureRepository(firstFactory)
    registry.getRepository()
    expect(firstFactory).toHaveBeenCalledTimes(1)

    registry.configureRepository(() => fakeRepository('second'))
    registry.getRepository()
    registry.getRepository()

    expect(firstFactory).toHaveBeenCalledTimes(1)
  })
})

describe('the registry knows nothing about any backend', () => {
  // platformNeutrality.test.ts already forbids a browser token or an undeclared
  // package anywhere in core. This is narrower and about intent: the registry
  // must not learn to *pick* a backend, because the whole point is that the
  // choice belongs to the platform. Naming a backend here would compile.
  it('names no concrete backend and reads no configuration', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    // Vitest's root is the repository root; tolerate the package root too, the
    // same way platformNeutrality.test.ts locates core's sources.
    const source = [
      path.resolve(process.cwd(), 'packages/core/src/data/registry.ts'),
      path.resolve(process.cwd(), 'src/data/registry.ts'),
    ]
      .filter((p) => fs.existsSync(p))
      .map((p) => fs.readFileSync(p, 'utf8'))[0]
    expect(source).toBeTypeOf('string')

    // Comments are prose, and the module's header explains the boundary by
    // naming both backends. The assertion is about code.
    const code = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')

    for (const token of ['Dexie', 'Supabase', 'import.meta', 'process.env']) {
      expect(code).not.toContain(token)
    }
  })
})
