import type {
  Card,
  ID,
  MatchingInteraction,
  OrderingInteraction,
  Rating,
} from '@itera/core'

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

export interface MobileOrderingPreviewViewModel {
  cardId: Card['id']
  interactionType: 'ordering'
  current: number
  total: number
  prompt: {
    lead: string
    firstCode: string
    middle: string
    secondCode: string
    tail: string
  }
  interaction: OrderingInteraction
  initialOrder: ID[]
  ratingIntervals: Record<Rating, string>
}

export interface MobileMatchingPreviewViewModel {
  cardId: Card['id']
  interactionType: 'matching'
  current: number
  total: number
  prompt: string
  interaction: MatchingInteraction
  presentedItemIds: Record<ID, ID[]>
  ratingIntervals: Record<Rating, string>
}
