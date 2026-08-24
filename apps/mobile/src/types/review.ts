import type { Card, Rating } from '@itera/core'

export interface MobileRecallCodeLine {
  number: number
  parts: {
    text: string
    tone: 'plain' | 'type' | 'accent'
  }[]
}

export interface MobileRecallPreviewViewModel {
  cardId: Card['id']
  interactionType: 'recall'
  current: number
  total: number
  prompt: {
    lead: string
    inlineCode: string
    tail: string
    followLead: string
    followCode: string
    followTail: string
  }
  codeLanguage: string
  codeLines: MobileRecallCodeLine[]
  answer: {
    lead: string
    inlineCode: string
    tail: string
    detail: string
  }
  tip: {
    leadCode: string
    text: string
  }
  ratingIntervals: Record<Rating, string>
}
