import type { Card } from '@/types'
import type { CardResponse } from './registry/types'

// The "fully correct" interaction for a card, so Preview can reveal the answer
// of interactive types (MCQ/ordering/matching/completion) without the learner
// having to answer. Self-graded types need no response.
export function correctResponse(card: Card): CardResponse {
  switch (card.type) {
    case 'mcq':
      return card.content.correct
    case 'ordering':
      return card.content.items.map((i) => i.id)
    case 'matching':
      return Object.fromEntries(card.content.pairs.map((p) => [p.id, p.id]))
    case 'codeCompletion':
      return card.content.solutions[0] ?? ''
    default:
      return undefined
  }
}
