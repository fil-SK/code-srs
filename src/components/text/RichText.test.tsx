// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import {
  MUST_SURVIVE_LITERALLY,
  XSS_CODE_BLOCK,
  XSS_PAYLOADS,
} from '@itera/core/src/test/attackPayloads'
import { InlineText, RichText } from './RichText'

// Two jobs. First, that the renderer still produces the DOM it produced before
// the parser moved into @itera/core - the class strings and element choices
// are the visual contract every card surface inherits. Second, the actual
// content-security assertions: real DOM inspection with hostile input, not a
// snapshot and not "React escapes strings".
//
// CodeMirror has no precedent mounted under happy-dom in this repo (it needs
// DOM measurement APIs happy-dom stubs incompletely), so LazyCodeView is
// stubbed to render its `code` prop as a text child. That is the assertion
// that matters here anyway: the fenced body reaches the viewer as a string, as
// data, exactly as authored. Its literal *rendering* is verified in a real
// browser.
vi.mock('@/components/code/LazyCodeView', () => ({
  LazyCodeView: ({ code, language }: { code: string; language: string }) => (
    <div data-testid="code-view" data-language={language}>
      {code}
    </div>
  ),
}))

afterEach(() => cleanup())

// The invariants every content surface must satisfy for hostile input.
function expectInert(container: HTMLElement, payload: string) {
  expect(container.querySelectorAll('script,iframe,object,embed,style,link')).toHaveLength(0)

  for (const el of Array.from(container.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      expect(attr.name.toLowerCase()).not.toMatch(/^on/)
      expect(['href', 'src', 'srcset', 'action', 'formaction', 'style']).not.toContain(
        attr.name.toLowerCase(),
      )
    }
  }

  // Inert, but still *there*: the learner must be able to read what the card
  // says, so nothing may have been stripped. Counting angle brackets is the
  // precise version of that - `<` and `>` are never markers in this syntax, so
  // every one the author wrote must still be visible text. A renderer that
  // turned any of them into markup would come up short here.
  const text = container.textContent ?? ''
  const angles = (s: string) => (s.match(/[<>]/g) ?? []).length
  expect(angles(text)).toBe(angles(payload))
  expect(text).toContain('alert(1)')
}

describe('RichText rendering', () => {
  it('renders prose in a whitespace-preserving block', () => {
    const { container } = render(<RichText text={'line one\nline two'} />)
    const block = container.querySelector('.whitespace-pre-wrap')
    expect(block).not.toBeNull()
    expect(block?.textContent).toBe('line one\nline two')
  })

  it('applies the caller className to the wrapper, not to the prose block', () => {
    const { container } = render(<RichText text="hello" className="text-2xl font-bold" />)
    expect(container.firstElementChild?.className).toBe('text-2xl font-bold')
  })

  it('renders **bold** as <strong> and *italic* as <em>', () => {
    const { container } = render(<RichText text="**a** and *b*" />)
    expect(container.querySelector('strong')?.textContent).toBe('a')
    expect(container.querySelector('em')?.textContent).toBe('b')
  })

  it('renders inline code as <code> with the established pill styling', () => {
    const { container } = render(<RichText text="use `malloc` here" />)
    const code = container.querySelector('code')
    expect(code?.textContent).toBe('malloc')
    expect(code?.className).toBe(
      'rounded-[5px] bg-panel-2 px-1.5 py-0.5 font-mono text-[0.875em] text-accent',
    )
  })

  it('renders a fenced block through the code viewer with its language', () => {
    const { container, getByTestId } = render(<RichText text={'```cpp\nint x = 1;\n```'} />)
    expect(getByTestId('code-view').textContent).toBe('int x = 1;')
    expect(getByTestId('code-view').getAttribute('data-language')).toBe('cpp')
    expect(container.querySelector('.whitespace-pre-wrap')).toBeNull()
  })

  it('renders prose and code in authored order', () => {
    const { container } = render(<RichText text={'before\n```js\nx\n```\nafter'} />)
    const texts = Array.from(container.firstElementChild?.children ?? []).map(
      (el) => el.textContent,
    )
    expect(texts).toEqual(['before', 'x', 'after'])
  })

  it('renders nothing for empty text', () => {
    const { container } = render(<RichText text="" />)
    expect(container.firstElementChild?.childElementCount).toBe(0)
  })

  it('never treats underscores as emphasis', () => {
    const { container } = render(<RichText text="a snake_case_name and __dunder__" />)
    expect(container.querySelector('strong')).toBeNull()
    expect(container.querySelector('em')).toBeNull()
    expect(container.textContent).toBe('a snake_case_name and __dunder__')
  })
})

describe('InlineText rendering', () => {
  it('renders without a wrapping element', () => {
    const { container } = render(
      <span data-testid="host">
        <InlineText text="plain" />
      </span>,
    )
    expect(container.querySelector('[data-testid="host"]')?.childElementCount).toBe(0)
    expect(container.textContent).toBe('plain')
  })

  it('renders the same inline syntax as RichText', () => {
    const { container } = render(<InlineText text="**a** `b` *c*" />)
    expect(container.querySelector('strong')?.textContent).toBe('a')
    expect(container.querySelector('code')?.textContent).toBe('b')
    expect(container.querySelector('em')?.textContent).toBe('c')
  })

  it('does not treat a fence as a code block', () => {
    const { container } = render(<InlineText text={'```cpp\nint x;\n```'} />)
    expect(container.querySelector('[data-testid="code-view"]')).toBeNull()
    expect(container.textContent).toContain('int x;')
  })
})

describe('content security: hostile card text renders as inert, visible text', () => {
  it('creates no script, frame, handler or URL from any payload in RichText', () => {
    for (const payload of XSS_PAYLOADS) {
      const { container, unmount } = render(<RichText text={payload} />)
      expectInert(container, payload)
      unmount()
    }
  })

  it('creates no script, frame, handler or URL from any payload in InlineText', () => {
    for (const payload of XSS_PAYLOADS) {
      const { container, unmount } = render(<InlineText text={payload} />)
      expectInert(container, payload)
      unmount()
    }
  })

  it('renders a payload inside a fenced code block literally', () => {
    for (const source of XSS_CODE_BLOCK) {
      const { container, getByTestId, unmount } = render(<RichText text={source} />)
      const body = source.slice(source.indexOf('\n') + 1, source.lastIndexOf('\n```'))
      expect(getByTestId('code-view').textContent).toBe(body)
      expect(container.querySelectorAll('script,iframe,object,embed')).toHaveLength(0)
      unmount()
    }
  })

  it('executes nothing: a sentinel installed before rendering is never set', () => {
    const probed = window as Window & { __iteraXssProbe?: boolean }
    delete probed.__iteraXssProbe
    for (const payload of [...XSS_PAYLOADS, ...XSS_CODE_BLOCK]) {
      const { unmount } = render(<RichText text={`${payload}\nwindow.__iteraXssProbe = true`} />)
      unmount()
    }
    expect(probed.__iteraXssProbe).toBeUndefined()
  })

  it('does not destroy educational content: generics and operators survive byte for byte', () => {
    // Including `SELECT *`, whose lone star is not an emphasis marker and must
    // not be eaten - a naive sanitizer or a greedier syntax would lose it.
    for (const source of MUST_SURVIVE_LITERALLY) {
      const { container, unmount } = render(<RichText text={source} />)
      expect(container.textContent, source).toBe(source)
      unmount()
    }
  })

  it('keeps angle brackets as text, creating no element from card content', () => {
    const { container } = render(<RichText text="Vec<T> and <div>x</div>" />)
    // The prose block is RichText's own wrapper; nothing inside it is an
    // element, because nothing in the payload was parsed as one.
    const prose = container.querySelector('.whitespace-pre-wrap')
    expect(prose?.childElementCount).toBe(0)
    expect(container.textContent).toBe('Vec<T> and <div>x</div>')
  })

  it('renders an attack string that arrives through inline code literally', () => {
    const { container } = render(<RichText text="`<script>alert(1)</script>`" />)
    expect(container.querySelector('code')?.textContent).toBe('<script>alert(1)</script>')
    expect(container.querySelectorAll('script')).toHaveLength(0)
  })
})
