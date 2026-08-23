import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ITERA_SHADOW_INTENTS, iteraColors, iteraRadii } from '@itera/core'

// The seam between two representations of one brand.
//
// src/index.css is what actually paints the browser, and it stays that way: no
// value here is generated, injected or built. packages/core/src/design/tokens.
// ts is the same identity as values a platform without CSS can read - which a
// React Native app needs, since it cannot resolve a custom property.
//
// Two representations of one truth is normally how a palette drifts. This test
// is the alternative to a build step: it reads the stylesheet, reads the
// module, and fails if they disagree in either direction. No generated CSS, no
// watch process, no PostCSS plugin - and a mismatch fails the existing gate
// instead of shipping.
//
// Bidirectional matters. A one-way check (every token appears in CSS) would let
// a new --itera-* variable be added with no shared counterpart, which is
// exactly how the native side would end up missing a color it needs.

const CSS = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8')

// Values that are deliberately NOT shared, because the platforms model them
// differently rather than spelling them differently: a box-shadow string has no
// meaning in React Native, which uses elevation/shadowOpacity. The intent names
// are shared instead (ITERA_SHADOW_INTENTS). Asserted as an exact set below, so
// a newly added --itera-* variable cannot quietly land in this exemption.
const NOT_SHARED_AS_VALUES = ['shadow-card', 'shadow-float']

function block(selector: string): string {
  const start = CSS.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`${selector} not found in src/index.css`)
  const end = CSS.indexOf('\n}', start)
  return CSS.slice(start, end)
}

// `--itera-foo: #bar;` declarations inside a block, excluding the scoped
// re-point of the legacy semantic names (`--bg: var(--itera-canvas)`), which is
// a web compatibility mechanism rather than a token.
function declarations(source: string, prefix: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of source.matchAll(new RegExp(`--${prefix}([a-z0-9-]+):\\s*([^;]+);`, 'g'))) {
    out.set(m[1], m[2].trim())
  }
  return out
}

function camel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

const cssColors = declarations(block('.itera-scope'), 'itera-')
const cssRadii = declarations(block('@theme inline'), 'radius-itera-')

describe('the Itera palette has one truth in two representations', () => {
  it('reads a plausible number of declarations out of index.css', () => {
    // Guards against a parse that silently matched nothing, which would make
    // every assertion below vacuously true.
    expect(cssColors.size).toBeGreaterThan(20)
    expect(cssRadii.size).toBeGreaterThan(3)
  })

  it('exempts exactly the two shadow values, and nothing else', () => {
    const exempt = [...cssColors.keys()].filter((k) => !(camel(k) in iteraColors))
    expect(exempt.sort()).toEqual([...NOT_SHARED_AS_VALUES].sort())
  })

  it('shares the shadow intents by name even though the values differ', () => {
    expect([...ITERA_SHADOW_INTENTS].sort()).toEqual(
      NOT_SHARED_AS_VALUES.map((k) => k.replace('shadow-', '')).sort(),
    )
  })

  it('gives every CSS color variable the same value in the shared module', () => {
    for (const [name, value] of cssColors) {
      if (NOT_SHARED_AS_VALUES.includes(name)) continue
      const key = camel(name) as keyof typeof iteraColors
      expect(iteraColors[key], `--itera-${name}`).toBe(value)
    }
  })

  it('gives every shared color a CSS variable, so neither side has an orphan', () => {
    const fromCss = new Set([...cssColors.keys()].map(camel))
    for (const key of Object.keys(iteraColors)) {
      expect(fromCss.has(key), `iteraColors.${key} has no --itera-* variable`).toBe(true)
    }
  })

  it('gives every radius the same value, as a unitless number', () => {
    for (const [name, value] of cssRadii) {
      const key = camel(name) as keyof typeof iteraRadii
      expect(iteraRadii[key], `--radius-itera-${name}`).toBe(Number(value.replace('px', '')))
    }
    expect(Object.keys(iteraRadii).sort()).toEqual([...cssRadii.keys()].map(camel).sort())
  })

  it('shares no layout mechanics: the module carries identity only', () => {
    // A page width, a breakpoint or a nav height here would be the start of
    // pixel-parity between web and native, which the convergence plan rejects.
    const forbidden = /width|height|breakpoint|margin|padding|gap|sidebar|navbar|navigation|inset|offset|zindex/i
    for (const key of [...Object.keys(iteraColors), ...Object.keys(iteraRadii)]) {
      expect(forbidden.test(key), key).toBe(false)
    }
  })
})
