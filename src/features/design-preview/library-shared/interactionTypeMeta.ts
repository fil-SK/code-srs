import { ArrowUpDown, Code2, Grid2x2, HelpCircle, Link2, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InteractionType } from '@/types/cardV2'

// One consistent, distinguishing tint per interaction type (icon + solid
// tile color), modeled after v1's cardTypeMeta.ts shape but for the new
// 6-type CardV2 union. Lives inside the Cards table, not the Collection nav —
// unrelated to the "no colorful icon system for every Collection" constraint.
export const INTERACTION_META: Record<InteractionType, { label: string; icon: LucideIcon; tileClass: string }> = {
  recall: { label: 'Recall', icon: HelpCircle, tileClass: 'bg-itera-navy' },
  multiple_choice: { label: 'Multiple Choice', icon: ListChecks, tileClass: 'bg-amber-500' },
  write_code: { label: 'Write Code', icon: Code2, tileClass: 'bg-blue-600' },
  ordering: { label: 'Ordering', icon: ArrowUpDown, tileClass: 'bg-emerald-600' },
  matching: { label: 'Matching', icon: Link2, tileClass: 'bg-violet-600' },
  walkthrough: { label: 'Walkthrough', icon: Grid2x2, tileClass: 'bg-teal-600' },
}

export function interactionLabel(type: InteractionType): string {
  return INTERACTION_META[type].label
}

export const INTERACTION_TYPES = Object.keys(INTERACTION_META) as InteractionType[]
