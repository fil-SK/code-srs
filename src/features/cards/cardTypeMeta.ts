import type { Card, CardType } from '@/types'

// Display label + badge styling per card type. Mirrors the mockup's colors.
export const cardTypeMeta: Record<CardType, { label: string; badgeClass: string }> =
  {
    basic: { label: 'Basic', badgeClass: 'bg-blue/15 text-blue' },
    mcq: { label: 'MCQ', badgeClass: 'bg-green/15 text-green' },
    codeReading: { label: 'Code Reading', badgeClass: 'bg-accent-soft text-accent' },
    codeCompletion: { label: 'Completion', badgeClass: 'bg-amber/15 text-amber' },
    bugFinding: { label: 'Bug Finding', badgeClass: 'bg-red/15 text-red' },
    ordering: { label: 'Ordering', badgeClass: 'bg-blue/15 text-blue' },
    matching: { label: 'Matching', badgeClass: 'bg-green/15 text-green' },
  }

function firstLine(text: string): string {
  const line = text.split('\n')[0].trim()
  return line || '(untitled)'
}

// A short, human title for a card in lists. Exhaustive switch forces new types
// to declare how they title themselves.
export function getCardTitle(card: Card): string {
  switch (card.type) {
    case 'basic':
      return firstLine(card.content.front)
    case 'mcq':
      return firstLine(card.content.prompt)
    case 'codeReading':
      return firstLine(card.content.question)
    case 'codeCompletion':
      if (card.content.prompt?.trim()) return firstLine(card.content.prompt)
      return card.content.explanation
        ? firstLine(card.content.explanation)
        : 'Code completion'
    case 'bugFinding':
      return firstLine(card.content.question ?? 'Find the bug')
    case 'ordering':
      return firstLine(card.content.prompt)
    case 'matching':
      return firstLine(card.content.prompt)
    default: {
      const _exhaustive: never = card
      return _exhaustive
    }
  }
}
