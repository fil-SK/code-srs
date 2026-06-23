// Shared primitive aliases used across all domain entities.
export type ID = string // uuid v4 (see lib/id.ts)
export type Millis = number // epoch milliseconds, e.g. Date.now()

// A language-tagged code fragment. Reused by every card type that shows code,
// keeping "code is first-class" a single concept rather than a type per language.
export interface CodeBlock {
  language: string // CodeMirror/Shiki language id, e.g. 'cpp', 'python'
  code: string
}
