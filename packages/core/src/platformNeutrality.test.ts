// Mechanical enforcement of the two rules that make @itera/core shareable, both
// of which a human reviewer will eventually miss.
//
// tsconfig.core.json already fails the build on `window`/`document`/`process`
// by compiling with no DOM and no ambient types (D287). That catches globals,
// not *imports*: `import Dexie from 'dexie'` typechecks perfectly well here and
// would silently make the package unusable on React Native. So this file reads
// core's own sources off disk and asserts what the compiler cannot.
//
// It scans source only. Tests may reach for Node - the DST helper pins
// process.env.TZ - and that is the whole reason they compile under a separate
// project.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Vitest's root is the repository root; tolerate being run from the package too
// so a future `packages/core` runner does not silently scan nothing.
const CORE_SRC = [
  path.resolve(process.cwd(), 'packages/core/src'),
  path.resolve(process.cwd(), 'src'),
].find((p) => fs.existsSync(path.join(p, 'index.ts')))!

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(full)
    if (!e.name.endsWith('.ts') || e.name.endsWith('.test.ts')) return []
    // packages/core/src/test/ is test support, not shipped code.
    if (path.relative(CORE_SRC, full).split(path.sep)[0] === 'test') return []
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

// Word-boundary search, written by hand so `documentation` is not a hit for
// `document` while `document.title` is.
function containsIdentifier(code: string, name: string): boolean {
  const isWordChar = (c: string) => /[A-Za-z0-9_$]/.test(c)
  for (let i = code.indexOf(name); i !== -1; i = code.indexOf(name, i + 1)) {
    const before = code[i - 1] ?? ' '
    const after = code[i + name.length] ?? ' '
    if (!isWordChar(before) && !isWordChar(after)) return true
  }
  return false
}

// Import/export specifiers, e.g. `from 'ts-fsrs'`. Comments are stripped
// first: a path named in a header comment is prose, not a dependency.
function specifiers(source: string): string[] {
  return [...withoutComments(source).matchAll(/\bfrom\s+'([^']+)'/g)].map((m) => m[1])
}

const FORBIDDEN = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'navigator',
  'import.meta',
  'react-router',
  'react-dom',
  'dexie',
  '@codemirror',
  'dnd-kit',
  'lucide-react',
  'tailwind',
]

// The packages core's shipped code may import are exactly the ones its own
// manifest declares - read, not hardcoded, so importing something the package
// does not depend on fails here instead of resolving off the workspace root's
// hoisted node_modules and then failing under Metro. ts-fsrs is the only one,
// and it is pure arithmetic over Date.
const ALLOWED_PACKAGES = Object.keys(
  JSON.parse(fs.readFileSync(path.join(CORE_SRC, '..', 'package.json'), 'utf8')).dependencies ?? {},
)

const files = sourceFiles(CORE_SRC)

describe('@itera/core platform neutrality', () => {
  it('scans a non-empty set of core source files', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('references no browser or web-only platform token', () => {
    const hits: string[] = []
    for (const file of files) {
      const code = withoutComments(fs.readFileSync(file, 'utf8'))
      for (const token of FORBIDDEN) {
        // Bare identifiers get a word boundary so `documentation` is not a
        // hit; the package-name tokens are matched literally.
        const found = /^[a-zA-Z]+$/.test(token)
          ? containsIdentifier(code, token)
          : code.includes(token)
        if (found) hits.push(`${path.relative(CORE_SRC, file)}: ${token}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('imports nothing from the web app and nothing outside the package', () => {
    const hits: string[] = []
    for (const file of files) {
      for (const spec of specifiers(fs.readFileSync(file, 'utf8'))) {
        if (spec.startsWith('@/')) {
          hits.push(`${path.relative(CORE_SRC, file)}: ${spec} (web app alias)`)
        } else if (spec.startsWith('.')) {
          const resolved = path.resolve(path.dirname(file), spec)
          if (path.relative(CORE_SRC, resolved).startsWith('..')) {
            hits.push(`${path.relative(CORE_SRC, file)}: ${spec} (escapes the package)`)
          }
        } else if (!ALLOWED_PACKAGES.includes(spec) && !spec.startsWith('node:')) {
          hits.push(`${path.relative(CORE_SRC, file)}: ${spec} (undeclared dependency)`)
        }
      }
    }
    expect(hits).toEqual([])
  })

  it('never imports its own package name, which would make the barrel circular', () => {
    const hits = files.filter((file) =>
      specifiers(fs.readFileSync(file, 'utf8')).some((s) => s.startsWith('@itera/core')),
    )
    expect(hits).toEqual([])
  })
})
