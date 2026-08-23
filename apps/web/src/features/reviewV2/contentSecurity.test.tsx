// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { Card, CardInteraction, InteractionType } from '@itera/core'
import {
  MUST_SURVIVE_LITERALLY,
  REJECTED_IMAGE_SOURCES,
  VALID_PNG_DATA_URL,
  XSS_PAYLOADS,
} from '@itera/core/src/test/attackPayloads'
import {
  matchingFixture,
  multipleChoiceFixture,
  orderingFixture,
  recallFixture,
  walkthroughFixture,
  writeCodeFixture,
} from '@/features/design-preview/fixtures'
import { getInteractionDefinition } from './interactions/registry'
import { CardPrompt } from './components/CardPrompt'
import { TipPanel } from './components/TipPanel'
import { ExplanationPanel } from './components/ExplanationPanel'
import type { ReviewPhase } from './reviewPhase'

// The stored-XSS regression suite for card content, run against the six
// production interaction views rather than a stand-in.
//
// Those views are the single rendering path for every surface that shows a
// card: Review, /preview, /cards/:id/study, and all six authoring live
// previews (which mount the same `definition.View` through
// InteractionAnswerPreview). Exercising them in both phases therefore covers
// every place authored or imported content is displayed.
//
// The threat is stored XSS specifically: a malicious backup is imported, the
// content is persisted, and the victim later opens the card. So every
// user-authored field on every interaction is poisoned, not just the prompt.
vi.mock('@/components/code/LazyCodeView', () => ({
  LazyCodeView: ({ code, language }: { code: string; language: string }) => (
    <div data-testid="code-view" data-language={language}>
      {code}
    </div>
  ),
}))
vi.mock('@/components/code/LazyCodeEditor', () => ({
  LazyCodeEditor: ({ value }: { value: string; language: string }) => (
    <textarea data-testid="code-editor" className="cm-editor" defaultValue={value} />
  ),
}))

afterEach(() => cleanup())

const PRESENTING: ReviewPhase = { kind: 'presenting' }
const REVEALED: ReviewPhase = { kind: 'feedback', result: null }

// Replace every author-controlled string in a card with `payload`, leaving
// structural fields (ids, types, flags, numbers) alone. Anything a person can
// type into one of the six editors is a candidate for a hostile backup.
function poison<T>(value: T, payload: string): T {
  if (typeof value === 'string') return payload as unknown as T
  if (Array.isArray(value)) return value.map((v) => poison(v, payload)) as unknown as T
  if (value === null || typeof value !== 'object') return value

  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(source)) {
    // Structure, not content: rewriting these would break the card rather
    // than test the renderer.
    const structural =
      key === 'id' ||
      key === 'type' ||
      key === 'kind' ||
      key === 'deckId' ||
      key === 'format' ||
      key === 'state' ||
      key === 'correctOrder' ||
      key === 'relationships' ||
      key === 'language' ||
      key === 'image'
    out[key] = structural ? v : poison(v, payload)
  }
  return out as T
}

const FIXTURES = {
  recall: recallFixture,
  multiple_choice: multipleChoiceFixture,
  write_code: writeCodeFixture,
  ordering: orderingFixture,
  matching: matchingFixture,
  walkthrough: walkthroughFixture,
} as const

const INTERACTIONS = Object.keys(FIXTURES) as InteractionType[]

function renderInteraction(type: InteractionType, card: Card, phase: ReviewPhase) {
  const definition = getInteractionDefinition(type)
  const View = definition.View as React.ComponentType<{
    card: Card & { interaction: Extract<CardInteraction, { type: InteractionType }> }
    phase: ReviewPhase
    response: unknown
    setResponse: (r: unknown) => void
    onPrimaryAction: () => void
    responseReady: boolean
    hideActions?: boolean
  }>
  return render(
    <View
      card={card as never}
      phase={phase}
      response={undefined}
      setResponse={() => {}}
      onPrimaryAction={() => {}}
      responseReady={false}
    />,
  )
}

// The invariants. Nothing here is a snapshot: each one is a property the DOM
// must have no matter how the markup is arranged.
function expectNoExecutableContent(container: HTMLElement) {
  expect(container.querySelectorAll('script,iframe,object,embed,link,base')).toHaveLength(0)

  for (const el of Array.from(container.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      expect(attr.name.toLowerCase(), `${el.tagName}[${attr.name}]`).not.toMatch(/^on/)
    }
  }

  // No card content became a URL. The one legitimate URL sink in the whole
  // card model is the walkthrough image, tested separately below.
  for (const el of Array.from(container.querySelectorAll('[href],[src],[srcset],[action]'))) {
    for (const name of ['href', 'src', 'srcset', 'action']) {
      const value = el.getAttribute(name)
      if (value === null) continue
      expect(value.toLowerCase(), `${el.tagName}[${name}]`).not.toMatch(
        /^\s*(javascript|vbscript|data):/,
      )
    }
  }
}

describe('content security across all six interactions', () => {
  for (const type of INTERACTIONS) {
    describe(type, () => {
      it('renders every hostile payload as inert content on the question face', () => {
        for (const payload of XSS_PAYLOADS) {
          const card = poison(FIXTURES[type] as Card, payload)
          const { container, unmount } = renderInteraction(type, card, PRESENTING)
          expectNoExecutableContent(container)
          expect(container.textContent ?? '').toContain('alert(1)')
          unmount()
        }
      })

      it('renders every hostile payload as inert content on the revealed face', () => {
        for (const payload of XSS_PAYLOADS) {
          const card = poison(FIXTURES[type] as Card, payload)
          const { container, unmount } = renderInteraction(type, card, REVEALED)
          expectNoExecutableContent(container)
          unmount()
        }
      })

      it('preserves educational content that a naive sanitizer would destroy', () => {
        const source = 'Vec<T> and a < b && c > d'
        const card = poison(FIXTURES[type] as Card, source)
        const { container, unmount } = renderInteraction(type, card, PRESENTING)
        expect(container.textContent ?? '').toContain('Vec<T>')
        expect(container.textContent ?? '').toContain('a < b && c > d')
        unmount()
      })

      it('sets no sentinel: nothing in the card executed', () => {
        const probed = window as Window & { __iteraXssProbe?: boolean }
        delete probed.__iteraXssProbe
        for (const phase of [PRESENTING, REVEALED]) {
          for (const payload of XSS_PAYLOADS) {
            const card = poison(FIXTURES[type] as Card, `${payload}window.__iteraXssProbe=true`)
            const { unmount } = renderInteraction(type, card, phase)
            unmount()
          }
        }
        expect(probed.__iteraXssProbe).toBeUndefined()
      })
    })
  }
})

describe('content security for the shared card panels', () => {
  it('renders a hostile prompt inertly', () => {
    for (const payload of XSS_PAYLOADS) {
      const { container, unmount } = render(<CardPrompt text={payload} />)
      expectNoExecutableContent(container)
      unmount()
    }
  })

  it('renders a hostile Tip inertly', () => {
    for (const payload of XSS_PAYLOADS) {
      const { container, unmount } = render(<TipPanel text={payload} />)
      expectNoExecutableContent(container)
      expect(container.textContent ?? '').toContain('alert(1)')
      unmount()
    }
  })

  it('renders a hostile Explanation inertly', () => {
    for (const payload of XSS_PAYLOADS) {
      const { container, unmount } = render(<ExplanationPanel text={payload} />)
      expectNoExecutableContent(container)
      expect(container.textContent ?? '').toContain('alert(1)')
      unmount()
    }
  })

  it('keeps generics and operators intact in a Tip and an Explanation', () => {
    for (const source of MUST_SURVIVE_LITERALLY) {
      const tip = render(<TipPanel text={source} />)
      expect(tip.container.textContent).toContain(source)
      tip.unmount()
      const explanation = render(<ExplanationPanel text={source} />)
      expect(explanation.container.textContent).toContain(source)
      explanation.unmount()
    }
  })
})

describe('the walkthrough image is the one URL sink, and it is closed', () => {
  function walkthroughWithImage(image: string): Card {
    return {
      ...walkthroughFixture,
      interaction: { ...walkthroughFixture.interaction, image },
    }
  }

  it('renders no <img> at all for a rejected source, even from a card built directly', () => {
    // Directly constructed, so this covers a row already in the store from
    // before the rule existed as well as anything that bypassed validation.
    for (const source of REJECTED_IMAGE_SOURCES) {
      const { container, unmount } = renderInteraction(
        'walkthrough',
        walkthroughWithImage(source),
        PRESENTING,
      )
      expect(container.querySelectorAll('img'), source).toHaveLength(0)
      unmount()
    }
  })

  it('still renders a legitimate embedded image, byte for byte', () => {
    const { container } = renderInteraction(
      'walkthrough',
      walkthroughWithImage(VALID_PNG_DATA_URL),
      PRESENTING,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe(VALID_PNG_DATA_URL)
  })

  it('renders no <img> when the card has no image', () => {
    const { interaction } = walkthroughFixture
    const card: Card = { ...walkthroughFixture, interaction: { ...interaction, image: undefined } }
    const { container } = renderInteraction('walkthrough', card, PRESENTING)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
