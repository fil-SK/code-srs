// The semantic node types for Itera's card-text syntax.
//
// This is the whole contract between the one shared parser and any renderer.
// A renderer maps these nodes onto its platform's elements; it never sees the
// source string, never re-tokenizes, and therefore cannot invent a second
// interpretation of the syntax. That is the point of the split: the web app
// renders DOM elements, a future React Native app renders <Text>, and neither
// can disagree about what `**bold**` or a fenced block means.
//
// The union is deliberately closed and small. Card content is data, never
// markup: there is no `html` node, no `raw` node and no `url` node, so no
// renderer can be handed a string it is expected to execute or navigate to.
// Adding a member here is a product decision about the syntax, not a rendering
// detail - see docs/design-system.md and the Itera markdown subset it locks.

export type RichInline =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'inlineCode'; value: string }

export type RichBlock =
  | { kind: 'paragraph'; children: RichInline[] }
  | { kind: 'code'; language: string; value: string }

// Every node kind the parser can produce. Exported so a test can assert the
// union stays closed under hostile input rather than trusting the type system,
// which is erased at runtime.
export const RICH_INLINE_KINDS = ['text', 'strong', 'em', 'inlineCode'] as const
export const RICH_BLOCK_KINDS = ['paragraph', 'code'] as const
