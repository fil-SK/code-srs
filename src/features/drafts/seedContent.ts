import type {
  BasicContent,
  Card,
  CardType,
  CodeReadingContent,
  CodeCompletionContent,
  BugFindingContent,
  McqContent,
  MatchingContent,
  OrderingContent,
} from '@/types'
import { getCardDefinition } from '@/features/cards/registry'

// Build starting content for a given type, seeding the type's primary text
// field with a draft's captured text. Used when converting a draft to a card.
export function seedContent(type: CardType, text: string): Card['content'] {
  const base = getCardDefinition(type).emptyContent()
  const t = text.trim()
  if (!t) return base

  switch (type) {
    case 'basic':
      return { ...(base as BasicContent), front: t }
    case 'mcq':
      return { ...(base as McqContent), prompt: t }
    case 'codeReading':
      return { ...(base as CodeReadingContent), question: t }
    case 'bugFinding':
      return { ...(base as BugFindingContent), question: t }
    case 'ordering':
      return { ...(base as OrderingContent), prompt: t }
    case 'matching':
      return { ...(base as MatchingContent), prompt: t }
    case 'codeCompletion':
      return { ...(base as CodeCompletionContent), explanation: t }
    default:
      return base
  }
}
