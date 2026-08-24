import type {
  Card,
  ID,
  MatchingInteraction,
  MultipleChoiceInteraction,
  OrderingInteraction,
  Rating,
  WalkthroughInteraction,
  WriteCodeInteraction,
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

export interface MobileMultipleChoiceTextPart {
  text: string
  tone: 'plain' | 'code'
}

export interface MobileMultipleChoicePreviewViewModel {
  cardId: Card['id']
  interactionType: 'multiple_choice'
  current: number
  total: number
  promptParts: MobileMultipleChoiceTextPart[]
  interaction: MultipleChoiceInteraction
  presentedOptionIds: ID[]
  optionParts: Record<ID, MobileMultipleChoiceTextPart[]>
  ratingIntervals: Record<Rating, string>
}

export interface MobileWriteCodeTextPart {
  text: string
  tone: 'plain' | 'code'
}

export interface MobileWriteCodeCodeLine {
  number: number
  parts: {
    text: string
    tone: 'plain' | 'type' | 'keyword' | 'number' | 'comment' | 'accent'
  }[]
}

export interface MobileWriteCodePreviewViewModel {
  cardId: Card['id']
  interactionType: 'write_code'
  current: number
  total: number
  promptParts: MobileWriteCodeTextPart[]
  languageLabel: string
  interaction: WriteCodeInteraction
  expectedAnswerLines: MobileWriteCodeCodeLine[]
  explanationParts: MobileWriteCodeTextPart[]
  ratingIntervals: Record<Rating, string>
}

export interface MobileWalkthroughTextPart {
  text: string
  tone: 'plain' | 'code'
}

export interface MobileWalkthroughCodeLine {
  number: number
  parts: {
    text: string
    tone: 'plain' | 'type' | 'keyword' | 'number' | 'comment' | 'accent'
  }[]
}

export interface MobileWalkthroughStepPresentation {
  id: ID
  promptParts: MobileWalkthroughTextPart[]
  tipParts: MobileWalkthroughTextPart[]
  explanationParts: MobileWalkthroughTextPart[]
  optionParts?: Record<ID, MobileWalkthroughTextPart[]>
  recallAnswerParts?: MobileWalkthroughTextPart[]
}

export interface MobileWalkthroughPreviewViewModel {
  cardId: Card['id']
  interactionType: 'walkthrough'
  current: number
  total: number
  promptParts: MobileWalkthroughTextPart[]
  scenarioParts: MobileWalkthroughTextPart[]
  interaction: WalkthroughInteraction
  codeLines: MobileWalkthroughCodeLine[]
  stepPresentation: MobileWalkthroughStepPresentation[]
  globalTipParts: MobileWalkthroughTextPart[]
  globalExplanationParts: MobileWalkthroughTextPart[]
  ratingIntervals: Record<Rating, string>
}
