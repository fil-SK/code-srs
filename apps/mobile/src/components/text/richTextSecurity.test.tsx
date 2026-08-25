import {
  MUST_SURVIVE_LITERALLY,
  REJECTED_IMAGE_SOURCES,
  VALID_PNG_DATA_URL,
  XSS_CODE_BLOCK,
  XSS_PAYLOADS,
} from '@itera/core/src/test/attackPayloads'
import { render, screen } from '@testing-library/react-native'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Image } from 'react-native'

import { RichInlineNative, RichTextNative } from './RichTextNative'
import { SafeCardImage } from './SafeCardImage'

// The native half of the content-security regression the web boundary already
// has (apps/web/src/components/text/renderingSinks.test.ts).
//
// The shared parser produces a safe *tree*; that is not the same as rendering it
// safely, which is why this exists as its own pass rather than being inherited.
// The fixture is the same one the web suite drives, imported by source path -
// the deliberate test-only deep import into @itera/core, which production code
// must never copy.
//
// React Native does not execute DOM HTML, but "no DOM" is not the same as "no
// sink". The sinks that do exist on this platform are Linking.openURL, an Image
// source URI, a WebView, and any style or module name computed from content.
// Each is covered below.

describe('hostile card content renders inert', () => {
  it.each(XSS_PAYLOADS)('renders %s as literal text', (payload) => {
    render(<RichTextNative text={payload} />)
    // The parser strips its own markers from emphasis and inline-code payloads,
    // so match the inner string rather than the authored one.
    const expected = payload.replace(/^\*\*|\*\*$|^\*|\*$|^`|`$/g, '')
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it.each(XSS_PAYLOADS)('renders %s as literal text in a label', (payload) => {
    render(<RichInlineNative text={payload} />)
    const expected = payload.replace(/^\*\*|\*\*$|^\*|\*$|^`|`$/g, '')
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it.each(XSS_CODE_BLOCK)('renders a fenced attack block verbatim', (block) => {
    render(<RichTextNative text={block} />)

    const body = /```\w*\n([\s\S]*?)```/.exec(block)?.[1].replace(/\n$/, '') ?? ''
    for (const line of body.split('\n')) {
      expect(screen.getByText(line)).toBeTruthy()
    }
  })

  it('never produces an Image from card text, however hostile', () => {
    for (const payload of XSS_PAYLOADS) {
      const view = render(<RichTextNative text={payload} />)
      expect(view.UNSAFE_queryAllByType(Image)).toHaveLength(0)
      view.unmount()
    }
  })
})

describe('legitimate technical content survives byte for byte', () => {
  it.each(MUST_SURVIVE_LITERALLY)('keeps %s intact', (content) => {
    render(<RichTextNative text={content} />)
    expect(screen.getByText(content)).toBeTruthy()
  })

  it.each(MUST_SURVIVE_LITERALLY)('keeps %s intact inside a code block', (content) => {
    render(<RichTextNative text={'```cpp\n' + content + '\n```'} />)
    expect(screen.getByText(content)).toBeTruthy()
  })
})

describe('the Walkthrough image sink', () => {
  it('renders the one accepted form', () => {
    render(<SafeCardImage label="Diagram" source={VALID_PNG_DATA_URL} />)
    expect(screen.getByLabelText('Diagram')).toBeTruthy()
  })

  it.each(REJECTED_IMAGE_SOURCES)('renders nothing for %s', (source) => {
    const view = render(<SafeCardImage label="Diagram" source={source} />)
    expect(view.toJSON()).toBeNull()
  })

  it('renders nothing when a card carries no image', () => {
    const view = render(<SafeCardImage label="Diagram" source={undefined} />)
    expect(view.toJSON()).toBeNull()
  })
})

// A source scan, the same shape as the web sink test: an assertion about what
// may exist at all, rather than about one render. A future contributor adding a
// link or a WebView to the content path fails the build here.
//
// Comments are stripped before matching, so this file and the module docs that
// name these sinks in prose do not report themselves.
describe('no native content sink exists', () => {
  const root = join(__dirname, '..')

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) return sourceFiles(full)
      if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return []
      return [full]
    })
  }

  function codeOf(file: string): string {
    return readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
  }

  const files = sourceFiles(root)

  it('scans the whole component tree', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('never opens a URL from anywhere in the component tree', () => {
    expect(files.filter((file) => /Linking/.test(codeOf(file)))).toEqual([])
  })

  it('never renders a WebView', () => {
    expect(files.filter((file) => /WebView/.test(codeOf(file)))).toEqual([])
  })

  it('builds an Image source from data nowhere but the gate', () => {
    // A bundled require() asset is fine; a { uri } built from card data is not,
    // except in SafeCardImage, which is the gate itself.
    const offenders = files.filter((file) => {
      if (file.endsWith('SafeCardImage.tsx')) return false
      return /source=\{\{\s*uri/.test(codeOf(file))
    })
    expect(offenders).toEqual([])
  })
})
