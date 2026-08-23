import type { LucideIcon } from 'lucide-react'
import type { InteractionType } from '@/types'
import { INTERACTION_META } from '@/features/cards/shared/interactionTypeMeta'

export interface RowVisual {
  icon: LucideIcon
  tileClass: string
  label: string
}

// Icon/label/colour for a card's interaction, so table rows and headers read
// from one table rather than duplicating those choices at each call site.
export function rowVisualFor(type: InteractionType): RowVisual {
  const meta = INTERACTION_META[type]
  return { icon: meta.icon, tileClass: meta.tileClass, label: meta.label }
}
