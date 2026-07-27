import type { InteractionType } from '@/types/cardV2'
import { INTERACTION_META, INTERACTION_TYPES } from './shared/interactionTypeMeta'
import { cn } from '@/lib/cn'

// Spec §22.2: "restrained list/modules with a small interaction sketch,
// avoid a rainbow icon grid." All six types render (matches the approved
// mockup); all six now have editors built (Walkthrough completes the set).
const ENABLED: InteractionType[] = [
  'recall',
  'multiple_choice',
  'write_code',
  'ordering',
  'matching',
  'walkthrough',
]

export function CardTypeChooser({
  selected,
  onSelect,
}: {
  selected?: InteractionType | null
  onSelect: (type: InteractionType) => void
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-itera-muted">
        1. Choose interaction
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {INTERACTION_TYPES.map((type) => {
          const meta = INTERACTION_META[type]
          const Icon = meta.icon
          const enabled = ENABLED.includes(type)
          const isSelected = enabled && selected === type
          return (
            <button
              key={type}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(type)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-itera-card border px-3 py-4 text-center transition-colors',
                enabled
                  ? isSelected
                    ? 'border-itera-accent bg-itera-accent text-white shadow-sm'
                    : 'border-itera-border bg-itera-surface text-itera-ink-brand hover:border-itera-navy hover:bg-itera-navy-soft'
                  : 'cursor-not-allowed border-itera-border bg-itera-surface text-itera-muted opacity-60',
              )}
            >
              <Icon size={20} className={isSelected ? 'text-white' : enabled ? 'text-itera-navy' : 'text-itera-muted'} />
              <span className="text-sm font-semibold">{meta.label}</span>
              {!enabled && <span className="text-[11px] text-itera-muted">Coming soon</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
