import type { ComponentType } from 'react'
import type { CardOfType, CardType } from '@/types'

// The user's in-progress interaction for an interactive card (e.g. selected
// option ids, an ordering). Self-graded types ignore it. Typed per definition.
export type CardResponse = unknown

export interface QuestionProps<T extends CardType> {
  content: CardOfType<T>['content']
  revealed: boolean
  response: CardResponse
  setResponse: (response: CardResponse) => void
}

export interface AnswerProps<T extends CardType> {
  content: CardOfType<T>['content']
  response: CardResponse
}

export interface EditorProps<T extends CardType> {
  content: CardOfType<T>['content']
  onChange: (content: CardOfType<T>['content']) => void
}

// Everything needed to render, edit, and (optionally) auto-grade one card type.
// Adding a type = author this once and register it.
export interface CardTypeDefinition<T extends CardType> {
  type: T
  interactive: boolean // requires a response before reveal (MCQ, ordering, matching)
  emptyContent: () => CardOfType<T>['content']
  isComplete: (content: CardOfType<T>['content']) => boolean
  Question: ComponentType<QuestionProps<T>>
  Answer: ComponentType<AnswerProps<T>>
  Editor: ComponentType<EditorProps<T>>
  // Return correctness for auto-gradable types, or null/undefined if self-graded.
  autoGrade?: (
    content: CardOfType<T>['content'],
    response: CardResponse,
  ) => { correct: boolean } | null
  // For interactive types: is there enough of a response to check? (defaults true)
  isResponseReady?: (response: CardResponse) => boolean
}
