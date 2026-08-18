import { INTERACTION_META } from '@/features/cards/shared/interactionTypeMeta'
import type { InteractionType } from '@/types/card'

// Small, quiet pill naming the active interaction type ("Recall", "Multiple
// Choice", ...), placed near the card's top edge per spec §16.1/§17.1/etc.
// Shared across every interaction type's front face, not Recall-specific.
// Icon + label both come from INTERACTION_META - the same table "Choose
// interaction" uses - so the two never drift apart.
export function InteractionLabel({ type }: { type: InteractionType }) {
  const { label, icon: Icon } = INTERACTION_META[type]
  return (
    <div className="inline-flex items-center gap-1.5 rounded-itera-pill bg-itera-surface-subtle px-4 py-2 text-sm font-semibold text-itera-ink-brand">
      <Icon size={16} />
      {label}
    </div>
  )
}
