import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// "Card content is data, never markup" is only true while no module in the web
// app has a way to turn a string into live DOM. That is a property of the whole
// source tree, not of RichText.tsx, so it is asserted the way the auth-storage
// rule is: by reading every production module off disk.
//
// This is the durable half of the 2026-08-23 content-security audit. The audit
// itself found zero raw-HTML sinks; without this test, that finding decays the
// first time somebody reaches for innerHTML to solve an unrelated problem, and
// the malicious-content suites next door would all still pass, because they
// exercise the content boundary rather than the module that broke.
//
// Test files are excluded: a test may legitimately construct DOM directly to
// assert something about it.

const SRC = path.resolve(process.cwd(), 'src')

// Every API that converts a string into executable markup or code. There is no
// allowlist on purpose: this repo builds its markdown by hand precisely so it
// never needs one, and a genuine future need for any of these is a decision
// that should show up as an edit to this list with a reason attached.
const FORBIDDEN_SINKS = [
  'dangerouslySetInnerHTML',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'DOMParser',
  'createContextualFragment',
  'eval(',
  'new Function(',
]

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

const files = sourceFiles(SRC)

const hits = files.flatMap((file) => {
  const code = withoutComments(fs.readFileSync(file, 'utf8'))
  return FORBIDDEN_SINKS.filter((sink) => code.includes(sink)).map(
    (sink) => `${path.relative(SRC, file).split(path.sep).join('/')}: ${sink}`,
  )
})

describe('the web app has no raw-HTML or code-evaluation sink', () => {
  it('scans a non-empty set of web sources', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('never converts a string into markup or code', () => {
    expect(hits).toEqual([])
  })

  it('is not vacuous: it would catch a sink if one were introduced', () => {
    const contrived = 'el.innerHTML = card.prompt.value'
    expect(FORBIDDEN_SINKS.some((sink) => withoutComments(contrived).includes(sink))).toBe(true)
  })

  it('does not treat a sink named in a comment as a use', () => {
    const commented = '// never use dangerouslySetInnerHTML here\nconst a = 1'
    expect(FORBIDDEN_SINKS.some((sink) => withoutComments(commented).includes(sink))).toBe(false)
  })
})
