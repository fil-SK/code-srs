// The single behaviour change of the hook extraction, protected directly.
//
// Every hook module used to open with `const repo = getRepository()`. That is
// what made importing a hook transitively construct a backend, and it is the
// reason these modules could not be shared: a React Native bundle has no Dexie
// and no import.meta.env, so evaluating that line was a crash before any
// component rendered.
//
// Two independent assertions, because either alone is weak. The runtime one
// proves the modules evaluate against an unconfigured registry; the source scan
// proves the *pattern* is gone rather than merely being unreachable today.
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const HOOKS_DIR = [
  path.resolve(process.cwd(), 'packages/core/src/hooks'),
  path.resolve(process.cwd(), 'src/hooks'),
].find((p) => fs.existsSync(path.join(p, 'queryKeys.ts')))!

const HOOK_MODULES = [
  './useBackup',
  './useCards',
  './useDecks',
  './useDrafts',
  './useReview',
  './useRoadmaps',
]

describe('importing a shared hook module', () => {
  it('does not resolve a repository, so an unconfigured registry is fine', async () => {
    // A pristine registry: nothing has called configureRepository(). If any
    // module read it at evaluation time this would throw.
    vi.resetModules()
    const { getRepository } = await import('../data/registry')
    expect(() => getRepository()).toThrow(/configureRepository/)

    for (const specifier of HOOK_MODULES) {
      await expect(import(specifier)).resolves.toBeTruthy()
    }

    // Still unconfigured afterwards: importing did not configure anything
    // either, which would have been the other way to make the check pass.
    expect(() => getRepository()).toThrow(/configureRepository/)
  })

  it('leaves the whole barrel importable without a configured backend', async () => {
    vi.resetModules()
    const core = await import('../index')
    expect(typeof core.useDueCards).toBe('function')
    expect(typeof core.configureRepository).toBe('function')
  })
})

describe('hook sources', () => {
  const sources = fs
    .readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => [f, fs.readFileSync(path.join(HOOKS_DIR, f), 'utf8')] as const)

  it('scans every hook module', () => {
    expect(sources.length).toBe(7) // six hook files plus queryKeys.ts
  })

  it('never bind getRepository() to a module-scope name', () => {
    // A top-level binding is the exact old pattern. Indented occurrences are
    // inside a function body, which is where resolution now belongs.
    const hits: string[] = []
    for (const [name, code] of sources) {
      for (const line of code.split('\n')) {
        if (/^(const|let|var)\s+\w+\s*=\s*getRepository\(\)/.test(line)) {
          hits.push(`${name}: ${line.trim()}`)
        }
      }
    }
    expect(hits).toEqual([])
  })

  it('name no backend, no environment lookup and no backend construction', () => {
    const hits: string[] = []
    for (const [name, code] of sources) {
      for (const token of [
        'DexieRepository',
        'new SupabaseRepository',
        'isSupabaseConfigured',
        'getSupabase',
      ]) {
        if (code.includes(token)) hits.push(`${name}: ${token}`)
      }
    }
    expect(hits).toEqual([])
  })
})
