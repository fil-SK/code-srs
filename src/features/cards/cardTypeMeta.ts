import {
  Bug,
  Brain,
  CodeXml,
  FileCode2,
  Link2,
  ListChecks,
  ListOrdered,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Card, CardType } from '@/types'

// Display label + badge styling per card type. Mirrors the mockup's colors.
// `icon`/`tileClass` are the Itera table-row visual language (same recipe as
// cardsV2's INTERACTION_META), added for the Library Deck page's card table —
// `label`/`badgeClass` stay as they were for the pre-Itera CardTypeBadge.
export const cardTypeMeta: Record<
  CardType,
  { label: string; badgeClass: string; icon: LucideIcon; tileClass: string }
> = {
  basic: { label: 'Basic', badgeClass: 'bg-blue/15 text-blue', icon: Brain, tileClass: 'bg-itera-navy' },
  mcq: { label: 'MCQ', badgeClass: 'bg-green/15 text-green', icon: ListChecks, tileClass: 'bg-amber-500' },
  codeReading: {
    label: 'Code Reading',
    badgeClass: 'bg-accent-soft text-accent',
    icon: CodeXml,
    tileClass: 'bg-blue-600',
  },
  codeCompletion: {
    label: 'Completion',
    badgeClass: 'bg-amber/15 text-amber',
    icon: FileCode2,
    tileClass: 'bg-cyan-600',
  },
  bugFinding: { label: 'Bug Finding', badgeClass: 'bg-red/15 text-red', icon: Bug, tileClass: 'bg-rose-600' },
  ordering: { label: 'Ordering', badgeClass: 'bg-blue/15 text-blue', icon: ListOrdered, tileClass: 'bg-emerald-600' },
  matching: { label: 'Matching', badgeClass: 'bg-green/15 text-green', icon: Link2, tileClass: 'bg-violet-600' },
  story: { label: 'Story', badgeClass: 'bg-accent-soft text-accent', icon: Waypoints, tileClass: 'bg-teal-600' },
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
    case 'story':
      if (card.content.intro?.trim()) return firstLine(card.content.intro)
      return card.content.steps[0]?.prompt
        ? firstLine(card.content.steps[0].prompt)
        : 'Story'
    default: {
      const _exhaustive: never = card
      return _exhaustive
    }
  }
}
