import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// "localSession.ts is the only file that may touch auth storage" has been a
// documented rule since the login screen shipped, and until now it was enforced
// by nothing at all. It is the kind of rule a reviewer misses once: a component
// that peeks at window.localStorage to decide whether someone is signed in
// reintroduces the second source of truth that audit P1-3 was about, and it
// would pass every other test in this repo.
//
// Now that the auth policy itself lives in @itera/core - which cannot name a
// browser API, and is guarded on that by packages/core/src/platformNeutrality.
// test.ts - this is the matching guard on the web half: core owns the decision,
// exactly one web module owns the storage.
//
// Test files are excluded: they seed and clear storage deliberately.

const SRC = path.resolve(process.cwd(), 'src')

// Every non-test module that may touch web storage, and why. A new entry here
// is a deliberate decision, not a detail: read the note on each before adding.
const ALLOWED = new Map([
  ['auth/localSession.ts', 'the auth session seam itself - the whole point of this test'],
  ['app/theme.tsx', 'the remembered theme preference, under its own key'],
  ['app/RouteError.tsx', 'the one-shot reload throttle after a stale-chunk failure'],
  ['lib/lazyWithRetry.ts', 'the same one-shot reload throttle, for lazy imports'],
])

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    if (!/\.tsx?$/.test(entry.name)) return []
    if (/\.test\.tsx?$/.test(entry.name)) return []
    return [full]
  })
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .map((line) => line.replace(/\s\/\/.*$/, ''))
    .join('\n')
}

const users = sourceFiles(SRC)
  .filter((file) => /\b(localStorage|sessionStorage)\b/.test(withoutComments(fs.readFileSync(file, 'utf8'))))
  .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
  .sort()

describe('web storage is isolated to the modules that own it', () => {
  it('scans a non-empty set of web sources', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(100)
  })

  it('touches web storage only where it is meant to', () => {
    expect(users).toEqual([...ALLOWED.keys()].sort())
  })

  it('keeps every auth storage access inside the browser session store', () => {
    expect(users.filter((file) => file.startsWith('auth/'))).toEqual(['auth/localSession.ts'])
  })

  // The sign-in screen, the route guard and the account menu all answer "who is
  // signed in?" from useAuth(), never from storage and never from the
  // environment. That is what keeps the mode decision single.
  it('keeps auth-facing UI away from storage entirely', () => {
    const uiPrefixes = ['features/login/', 'features/settings/', 'components/layout/']
    expect(users.filter((file) => uiPrefixes.some((p) => file.startsWith(p)))).toEqual([])
  })
})
