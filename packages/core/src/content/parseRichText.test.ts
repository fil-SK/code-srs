import { describe, expect, it } from 'vitest'
import { parseRichInline, parseRichText } from './parseRichText'
import { RICH_BLOCK_KINDS, RICH_INLINE_KINDS, type RichBlock } from './richTextNodes'
import {
  MUST_SURVIVE_LITERALLY,
  XSS_CODE_BLOCK,
  XSS_PAYLOADS,
} from '../test/attackPayloads'

// The Itera text syntax had no test file at all before it was extracted here:
// it was three regexes interleaved with JSX in a web component, and the rules
// most likely to be lost in a re-implementation (underscores are not emphasis;
// inline code beats emphasis; bold beats italic) were only ever documented in
// prose. These lock them.
//
// The security cases assert a structural property, not an escaping one: the
// parser produces data, so a hostile string can only ever come back out as the
// `value` of a text-ish node. Nothing here checks escaping, because nothing
// here escapes - preserving content exactly is the requirement, and safety is
// the renderer's refusal to use a raw-HTML sink.

function paragraphText(block: RichBlock): string {
  if (block.kind !== 'paragraph') throw new Error('expected a paragraph')
  return block.children.map((c) => c.value).join('')
}

describe('parseRichInline', () => {
  it('returns nothing for an empty string', () => {
    expect(parseRichInline('')).toEqual([])
  })

  it('returns one text node for ordinary prose', () => {
    expect(parseRichInline('A binary search halves the range.')).toEqual([
      { kind: 'text', value: 'A binary search halves the range.' },
    ])
  })

  it('keeps whitespace-only input as text', () => {
    expect(parseRichInline('   ')).toEqual([{ kind: 'text', value: '   ' }])
  })

  it('reads `code` as an inline code node with its contents literal', () => {
    expect(parseRichInline('call `std::sort(v.begin(), v.end())` first')).toEqual([
      { kind: 'text', value: 'call ' },
      { kind: 'inlineCode', value: 'std::sort(v.begin(), v.end())' },
      { kind: 'text', value: ' first' },
    ])
  })

  it('reads **bold** and *italic*', () => {
    expect(parseRichInline('**always** be *closing*')).toEqual([
      { kind: 'strong', value: 'always' },
      { kind: 'text', value: ' be ' },
      { kind: 'em', value: 'closing' },
    ])
  })

  it('matches bold before italic so ** wins over *', () => {
    expect(parseRichInline('**bold**')).toEqual([{ kind: 'strong', value: 'bold' }])
  })

  it('gives inline code precedence over emphasis, leaving stars literal inside it', () => {
    expect(parseRichInline('`a * b * c`')).toEqual([{ kind: 'inlineCode', value: 'a * b * c' }])
  })

  it('never treats underscores as emphasis, so snake_case stays literal', () => {
    for (const source of ['snake_case_name', '__dunder__', '_leading', 'a_b_c_d_e']) {
      expect(parseRichInline(source)).toEqual([{ kind: 'text', value: source }])
    }
  })

  it('leaves unmatched and malformed markers as literal text', () => {
    for (const source of ['a * b', 'unclosed `code', '**', '*', '```', 'a ** b', '`']) {
      expect(parseRichInline(source)).toEqual([{ kind: 'text', value: source }])
    }
  })

  it('does not match emphasis or code across a newline', () => {
    expect(parseRichInline('*a\nb*')).toEqual([{ kind: 'text', value: '*a\nb*' }])
    expect(parseRichInline('`a\nb`')).toEqual([{ kind: 'text', value: '`a\nb`' }])
  })

  it('emits no empty text nodes between adjacent matches', () => {
    const nodes = parseRichInline('**a****b**`c`')
    expect(nodes.every((n) => n.value.length > 0)).toBe(true)
  })
})

describe('parseRichText', () => {
  it('returns nothing for an empty string', () => {
    expect(parseRichText('')).toEqual([])
  })

  it('returns one paragraph for ordinary prose', () => {
    expect(parseRichText('Two lines\nof prose')).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', value: 'Two lines\nof prose' }] },
    ])
  })

  it('splits a fenced block out, keeping its language', () => {
    expect(parseRichText('before\n```cpp\nint x = 1;\n```\nafter')).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', value: 'before' }] },
      { kind: 'code', language: 'cpp', value: 'int x = 1;' },
      { kind: 'paragraph', children: [{ kind: 'text', value: 'after' }] },
    ])
  })

  it('defaults a fence with no language to text', () => {
    expect(parseRichText('```\nplain\n```')).toEqual([
      { kind: 'code', language: 'text', value: 'plain' },
    ])
  })

  it('ignores an info string after the language on the fence line', () => {
    expect(parseRichText('```ts title="demo.ts"\nconst a = 1\n```')).toEqual([
      { kind: 'code', language: 'ts', value: 'const a = 1' },
    ])
  })

  it('leaves an unterminated fence as prose rather than swallowing the rest', () => {
    const blocks = parseRichText('intro\n```cpp\nint x = 1;')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].kind).toBe('paragraph')
    expect(paragraphText(blocks[0])).toBe('intro\n```cpp\nint x = 1;')
  })

  it('handles two fenced blocks in a row', () => {
    expect(parseRichText('```a\n1\n```\n\n```b\n2\n```')).toEqual([
      { kind: 'code', language: 'a', value: '1' },
      { kind: 'code', language: 'b', value: '2' },
    ])
  })

  it('preserves interior blank lines in a code block but drops the closing newline', () => {
    expect(parseRichText('```py\na\n\nb\n```')).toEqual([
      { kind: 'code', language: 'py', value: 'a\n\nb' },
    ])
  })

  it('drops a prose run that is only blank lines, but keeps one of spaces', () => {
    expect(parseRichText('```a\n1\n```\n\n\n```b\n2\n```')).toHaveLength(2)

    const spaced = parseRichText('```a\n1\n```   ```b\n2\n```')
    expect(spaced.map((b) => b.kind)).toEqual(['code', 'paragraph', 'code'])
    expect(paragraphText(spaced[1])).toBe('   ')
  })

  it('parses inline syntax inside a paragraph but not inside a code block', () => {
    const blocks = parseRichText('use `x` and **y**\n```js\nuse `x` and **y**\n```')
    expect(blocks[0]).toEqual({
      kind: 'paragraph',
      children: [
        { kind: 'text', value: 'use ' },
        { kind: 'inlineCode', value: 'x' },
        { kind: 'text', value: ' and ' },
        { kind: 'strong', value: 'y' },
      ],
    })
    expect(blocks[1]).toEqual({ kind: 'code', language: 'js', value: 'use `x` and **y**' })
  })

  it('is deterministic across repeated calls on the same input', () => {
    // The fence regex is module-scoped and global, so a missing lastIndex
    // reset would make the second parse of the same string differ.
    const source = 'a\n```ts\nconst x = 1\n```\nb'
    const first = parseRichText(source)
    for (let i = 0; i < 5; i++) expect(parseRichText(source)).toEqual(first)
  })

  it('is deterministic when parses of different inputs interleave', () => {
    const a = '```ts\n1\n```'
    const b = 'no fence here at all'
    const aFirst = parseRichText(a)
    parseRichText(b)
    expect(parseRichText(a)).toEqual(aFirst)
  })
})

describe('content safety: the parser produces data, never markup', () => {
  it('returns every attack payload as inert text with its characters intact', () => {
    for (const payload of XSS_PAYLOADS) {
      const blocks = parseRichText(payload)
      const flattened = blocks.map(paragraphText).join('')
      // The markers Itera's own syntax owns are consumed; every other
      // character of the payload survives untouched.
      expect(flattened.replace(/[`*]/g, '')).toBe(payload.replace(/[`*]/g, ''))
      expect(blocks.every((b) => b.kind === 'paragraph')).toBe(true)
    }
  })

  it('returns an attack payload inside a fenced block byte for byte', () => {
    for (const source of XSS_CODE_BLOCK) {
      const blocks = parseRichText(source)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].kind).toBe('code')
      const body = source.slice(source.indexOf('\n') + 1, source.lastIndexOf('\n```'))
      expect(blocks[0]).toMatchObject({ value: body })
    }
  })

  it('preserves generics, templates and comparison operators exactly', () => {
    for (const source of MUST_SURVIVE_LITERALLY) {
      const blocks = parseRichText(source)
      expect(blocks).toHaveLength(1)
      expect(paragraphText(blocks[0])).toBe(source)
    }
  })

  it('cannot produce a node kind outside the closed union, for any payload', () => {
    const sources = [...XSS_PAYLOADS, ...XSS_CODE_BLOCK, ...MUST_SURVIVE_LITERALLY]
    for (const source of sources) {
      for (const block of parseRichText(source)) {
        expect(RICH_BLOCK_KINDS).toContain(block.kind)
        if (block.kind !== 'paragraph') continue
        for (const inline of block.children) expect(RICH_INLINE_KINDS).toContain(inline.kind)
      }
    }
  })

  it('produces nodes whose only fields are plain strings', () => {
    // No node may carry a url, an attribute bag or raw html: a renderer can
    // only ever be handed text plus a language id.
    for (const block of parseRichText('a `b` **c**\n```ts\nd\n```')) {
      const values = block.kind === 'code' ? [block.language, block.value] : block.children.map((c) => c.value)
      for (const value of values) expect(typeof value).toBe('string')
      const keys = block.kind === 'code' ? ['kind', 'language', 'value'] : ['kind', 'children']
      expect(Object.keys(block).sort()).toEqual(keys.sort())
    }
  })
})
