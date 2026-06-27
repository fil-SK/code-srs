import type { CodeBlock, ID, Millis } from './common'
import type { SchedulingState } from './review'

// Shared envelope for every card, regardless of type.
export interface CardBase {
  id: ID
  deckId: ID
  tags: string[]
  createdAt: Millis
  updatedAt: Millis
  suspended: boolean // excluded from the queue without deleting
  scheduling: SchedulingState
}

// ---- Per-type content payloads ----

export interface BasicContent {
  front: string // markdown (may embed code fences)
  back: string
}

export interface McqOption {
  id: ID
  text: string
}

export interface McqContent {
  prompt: string
  options: McqOption[]
  correct: ID[] // length 1 = single answer, >1 = multiple
  multiple: boolean // UI hint: checkbox vs radio
  explanation?: string
}

export interface CodeReadingContent {
  code: CodeBlock
  question: string
  answer: string // markdown, revealed
}

export type CodeValidationMode = 'none' | 'normalizedMatch' // 'run' deferred

export interface CodeCompletionContent {
  prompt?: string // optional prose question shown above the answer box
  scaffold: CodeBlock // code with a blank region/marker; may be empty
  solutions: string[] // accepted answers for auto-check
  validation: {
    mode: CodeValidationMode
    ignoreWhitespace: boolean
    caseSensitive: boolean
  }
  explanation?: string
}

export interface BugFindingContent {
  code: CodeBlock
  question?: string // defaults to "Find the bug" in the UI
  bugHint?: string // optional progressive hint
  explanation: string // the answer
}

export interface OrderingItem {
  id: ID
  text: string
  code?: CodeBlock
}

export interface OrderingContent {
  prompt: string
  items: OrderingItem[] // stored in CORRECT order; presented shuffled
}

export interface MatchingPair {
  id: ID
  left: string
  right: string
}

export interface MatchingContent {
  prompt: string
  pairs: MatchingPair[] // left<->right is the truth
}

// ---- The discriminated union ----

export type Card =
  | (CardBase & { type: 'basic'; content: BasicContent })
  | (CardBase & { type: 'mcq'; content: McqContent })
  | (CardBase & { type: 'codeReading'; content: CodeReadingContent })
  | (CardBase & { type: 'codeCompletion'; content: CodeCompletionContent })
  | (CardBase & { type: 'bugFinding'; content: BugFindingContent })
  | (CardBase & { type: 'ordering'; content: OrderingContent })
  | (CardBase & { type: 'matching'; content: MatchingContent })

export type CardType = Card['type']

// Narrow a Card to a specific variant, e.g. CardOfType<'basic'>.
export type CardOfType<T extends CardType> = Extract<Card, { type: T }>
