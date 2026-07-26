import { INTERACTION_META } from './interactionTypeMeta'
import type { InteractionType } from '@/types/cardV2'
import { cn } from '@/lib/cn'

export function InteractionTypeTile({ type }: { type: InteractionType }) {
  const meta = INTERACTION_META[type]
  const Icon = meta.icon
  return (
    <div
      className={cn(
        'grid h-8 w-8 flex-none place-items-center rounded-itera-control text-white',
        meta.tileClass,
      )}
    >
      <Icon size={15} />
    </div>
  )
}

export function InteractionTypeBadge({ type }: { type: InteractionType }) {
  const meta = INTERACTION_META[type]
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-itera-ink">
      <Icon size={14} className="text-itera-muted" />
      {meta.label}
    </span>
  )
}
