import type { InteractionType } from '@/types/card'
import { INTERACTION_META, INTERACTION_TYPES } from './shared/interactionTypeMeta'
import { cn } from '@/lib/cn'

// All six existing icons stay sourced from INTERACTION_META. The create-flow
// redesign changes only the tiles around them, following add-new-card.png.
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
      <div className="mb-3 text-sm font-semibold text-itera-ink-brand">
        1. Choose interaction
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
              aria-pressed={isSelected}
              className={cn(
                'flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-itera-control border bg-itera-surface px-2 py-3 text-center transition-colors',
                enabled
                  ? isSelected
                    ? 'border-itera-accent text-itera-ink-brand shadow-[0_0_0_1px_var(--itera-accent)]'
                    : 'border-itera-border text-itera-ink-brand hover:border-itera-border-strong hover:bg-itera-surface-subtle'
                  : 'cursor-not-allowed border-itera-border bg-itera-surface text-itera-muted opacity-60',
              )}
            >
              <Icon
                size={20}
                className={isSelected ? 'text-itera-accent' : enabled ? 'text-itera-navy' : 'text-itera-muted'}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold">{meta.label}</span>
              {!enabled && <span className="text-[11px] text-itera-muted">Coming soon</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
