import type { Card } from '@/types'

// Flatten a card's content into one lowercased string for substring search.
// Tags are always included. The exhaustive switch means a new card type will
// fail to compile here until its searchable fields are declared.
export function searchableText(card: Card): string {
  const parts: string[] = [...card.tags]

  switch (card.type) {
    case 'basic':
      parts.push(card.content.front, card.content.back)
      break
    case 'mcq':
      parts.push(card.content.prompt, card.content.explanation ?? '')
      parts.push(...card.content.options.map((o) => o.text))
      break
    case 'codeReading':
      parts.push(card.content.code.code, card.content.question, card.content.answer)
      break
    case 'codeCompletion':
      parts.push(card.content.scaffold.code, card.content.explanation ?? '')
      parts.push(...card.content.solutions)
      break
    case 'bugFinding':
      parts.push(
        card.content.code.code,
        card.content.question ?? '',
        card.content.bugHint ?? '',
        card.content.explanation,
      )
      break
    case 'ordering':
      parts.push(card.content.prompt)
      parts.push(...card.content.items.map((i) => i.text))
      break
    case 'matching':
      parts.push(card.content.prompt)
      for (const pair of card.content.pairs) parts.push(pair.left, pair.right)
      break
    default: {
      const _exhaustive: never = card
      return _exhaustive
    }
  }

  return parts.join(' \n ').toLowerCase()
}
