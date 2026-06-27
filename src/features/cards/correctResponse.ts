import type { Card } from '@/types'
import { thirdKey } from './renderers/matching/keys'
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
    case 'matching': {
      const entries: [string, string][] = []
      for (const p of card.content.pairs) {
        entries.push([p.id, p.id])
        if (card.content.triple) entries.push([thirdKey(p.id), p.id])
      }
      return Object.fromEntries(entries)
    }
    case 'codeCompletion':
      return card.content.solutions[0] ?? ''
    default:
      return undefined
  }
}
