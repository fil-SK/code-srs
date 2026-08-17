import { Brain, CodeXml, Link2, ListChecks, ListOrdered, Waypoints } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InteractionType } from '@/types/cardV2'

// One consistent, distinguishing tint per interaction type (icon + solid
// tile color), modeled after cardTypeMeta.ts's shape but for the new 6-type
// CardV2 union. Promoted into production once the real Deck page needed it too
// (see docs/itera-decisions.md). Also the single
// source of truth for reviewV2's per-card pill icon (InteractionLabel), so
// the flashcard and the "Choose interaction" tile always agree.
export const INTERACTION_META: Record<InteractionType, { label: string; icon: LucideIcon; tileClass: string }> = {
  recall: { label: 'Recall', icon: Brain, tileClass: 'bg-itera-navy' },
  multiple_choice: { label: 'Multiple Choice', icon: ListChecks, tileClass: 'bg-amber-500' },
  write_code: { label: 'Write Code', icon: CodeXml, tileClass: 'bg-blue-600' },
  ordering: { label: 'Ordering', icon: ListOrdered, tileClass: 'bg-emerald-600' },
  matching: { label: 'Matching', icon: Link2, tileClass: 'bg-violet-600' },
  walkthrough: { label: 'Walkthrough', icon: Waypoints, tileClass: 'bg-teal-600' },
}

export function interactionLabel(type: InteractionType): string {
  return INTERACTION_META[type].label
}

export const INTERACTION_TYPES = Object.keys(INTERACTION_META) as InteractionType[]
