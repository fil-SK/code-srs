import type { RichBlock, RichInline } from './richTextNodes'

// The one interpretation of Itera's card-text syntax.
//
// A deliberately small, hand-written markdown subset - not a full parser, and
// no markdown dependency (see the hand-built rule in docs/architecture.md).
// Supported, and nothing else:
//
//   ```lang        fenced code block, rendered by the platform's code viewer
//   `code`         inline code, contents literal
//   **bold**
//   *italic*
//
// Three rules matter more than the grammar, and a native renderer that
// re-implemented this instead of calling it would get them wrong:
//
//  1. Underscores are NEVER emphasis markers. Flashcard content here is
//     code-adjacent, so snake_case_identifiers must render literally rather
//     than being mangled. Only `*` and `**` mark emphasis.
//  2. Inline code takes precedence over emphasis, and its contents stay
//     literal - `*` inside backticks is a star, not italics.
//  3. Bold is matched before italic so `**` wins over `*`.
//
// This module was the tokenizer half of the web app's RichText.tsx and moved
// here unchanged in behavior. It produces data, never markup: the returned
// nodes carry only plain strings and a language id, so no renderer is ever
// handed something it is expected to execute. Content safety is therefore a
// property of this shape plus each renderer's refusal to use a raw-HTML sink,
// not of any escaping or stripping done here - card text is preserved exactly,
// because `<`, `>`, `&` and generics are legitimate educational content.

// The opening fence's language runs to the first whitespace; anything else on
// the fence line (an info string) is consumed and ignored.
const FENCE = /```(\w*)[^\n]*\n([\s\S]*?)```/g

// A fenced block with no language still needs one for the viewer.
const DEFAULT_CODE_LANGUAGE = 'text'

// Inline code first, so its contents never reach the emphasis pass.
const INLINE_CODE_SPLIT = /(`[^`\n]+`)/g
const INLINE_CODE_EXACT = /^`[^`\n]+`$/

// Bold before italic in one alternation, so `**x**` cannot be read as an empty
// italic wrapping a star.
const EMPHASIS_SPLIT = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g
const STRONG_EXACT = /^\*\*[^*\n]+\*\*$/
const EM_EXACT = /^\*[^*\n]+\*$/

// Leading and trailing blank lines around a prose run, which come from the
// fences that delimited it rather than from the author.
const SURROUNDING_NEWLINES = /^\n+|\n+$/g

interface RawBlock {
  type: 'code' | 'text'
  language?: string
  body: string
}

function splitBlocks(source: string): RawBlock[] {
  const blocks: RawBlock[] = []
  let last = 0
  let match: RegExpExecArray | null

  // FENCE is module-scoped and global, so its lastIndex survives between
  // calls. Resetting is what makes repeated parses of the same string return
  // the same result; a test locks this.
  FENCE.lastIndex = 0

  while ((match = FENCE.exec(source))) {
    if (match.index > last) {
      blocks.push({ type: 'text', body: source.slice(last, match.index) })
    }
    blocks.push({
      type: 'code',
      language: match[1] || DEFAULT_CODE_LANGUAGE,
      // One trailing newline belongs to the closing fence, not the code.
      body: match[2].replace(/\n$/, ''),
    })
    last = match.index + match[0].length
  }

  if (last < source.length) blocks.push({ type: 'text', body: source.slice(last) })
  return blocks
}

function emphasis(text: string): RichInline[] {
  const nodes: RichInline[] = []
  for (const part of text.split(EMPHASIS_SPLIT)) {
    // String.split with a capturing group yields empty strings between
    // adjacent matches. They carried no content and are dropped.
    if (part === '') continue
    if (STRONG_EXACT.test(part)) nodes.push({ kind: 'strong', value: part.slice(2, -2) })
    else if (EM_EXACT.test(part)) nodes.push({ kind: 'em', value: part.slice(1, -1) })
    else nodes.push({ kind: 'text', value: part })
  }
  return nodes
}

/**
 * Inline-only parse, for short labels that carry no block structure: multiple
 * choice options, ordering items, matching cells. Fences are not recognised
 * here - a label is one line of prose.
 */
export function parseRichInline(source: string): RichInline[] {
  const nodes: RichInline[] = []
  for (const part of source.split(INLINE_CODE_SPLIT)) {
    if (part === '') continue
    if (INLINE_CODE_EXACT.test(part)) nodes.push({ kind: 'inlineCode', value: part.slice(1, -1) })
    else nodes.push(...emphasis(part))
  }
  return nodes
}

/**
 * Block-level parse for a card text field: fenced code blocks plus prose
 * paragraphs, each paragraph already broken into inline runs.
 *
 * A prose run that is only blank lines is dropped, since it exists solely to
 * separate two fences. A run of spaces is not blank in that sense and is kept,
 * matching the pre-extraction behavior exactly.
 */
export function parseRichText(source: string): RichBlock[] {
  const blocks: RichBlock[] = []

  for (const raw of splitBlocks(source)) {
    if (raw.type === 'code') {
      blocks.push({
        kind: 'code',
        language: raw.language ?? DEFAULT_CODE_LANGUAGE,
        value: raw.body,
      })
      continue
    }
    const body = raw.body.replace(SURROUNDING_NEWLINES, '')
    if (body.length === 0) continue
    blocks.push({ kind: 'paragraph', children: parseRichInline(body) })
  }

  return blocks
}
