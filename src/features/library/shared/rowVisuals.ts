import type { LucideIcon } from 'lucide-react'
import type { CardType } from '@/types'
import type { InteractionType } from '@/types/cardV2'
import { cardTypeMeta } from '@/features/cards/cardTypeMeta'
import { INTERACTION_META } from '@/features/cardsV2/shared/interactionTypeMeta'

export interface RowVisual {
  icon: LucideIcon
  tileClass: string
  label: string
}

// One lookup for both the v1 CardType union and the v2 InteractionType union,
// so a single table row/header can render either kind without a switch at
// every call site. Reads the two existing per-type maps rather than
// duplicating their icon/color choices.
export function rowVisualFor(row: { kind: 'v1' | 'v2'; type: string }): RowVisual {
  if (row.kind === 'v2') {
    const meta = INTERACTION_META[row.type as InteractionType]
    return { icon: meta.icon, tileClass: meta.tileClass, label: meta.label }
  }
  const meta = cardTypeMeta[row.type as CardType]
  return { icon: meta.icon, tileClass: meta.tileClass, label: meta.label }
}
