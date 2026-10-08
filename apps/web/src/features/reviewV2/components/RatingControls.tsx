import type { Rating } from '@/types'
import { cn } from '@/lib/cn'
import {
  Mountain,
  Feather,
  Check,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'

const BUTTONS: {
  rating: Rating
  label: string
  Icon: LucideIcon
  surfaceClass: string
  iconClass: string
}[] = [
  {
    rating: 1, label: 'Again', Icon: RefreshCw,
    surfaceClass: 'hover:bg-[color-mix(in_srgb,var(--fliptap-error)_14%,var(--fliptap-surface))] hover:border-fliptap-error/65 focus-visible:bg-[color-mix(in_srgb,var(--fliptap-error)_14%,var(--fliptap-surface))] focus-visible:border-fliptap-error/65 focus-visible:ring-fliptap-error/50',
    iconClass: 'group-hover:text-fliptap-error group-focus-visible:text-fliptap-error',
  },
  {
    rating: 2, label: 'Hard', Icon: Mountain,
    surfaceClass: 'hover:bg-[color-mix(in_srgb,var(--fliptap-warning)_14%,var(--fliptap-surface))] hover:border-fliptap-warning/65 focus-visible:bg-[color-mix(in_srgb,var(--fliptap-warning)_14%,var(--fliptap-surface))] focus-visible:border-fliptap-warning/65 focus-visible:ring-fliptap-warning/50',
    iconClass: 'group-hover:text-fliptap-warning group-focus-visible:text-fliptap-warning',
  },
  {
    rating: 3, label: 'Good', Icon: Check,
    surfaceClass: 'hover:bg-[color-mix(in_srgb,var(--fliptap-success)_14%,var(--fliptap-surface))] hover:border-fliptap-success/65 focus-visible:bg-[color-mix(in_srgb,var(--fliptap-success)_14%,var(--fliptap-surface))] focus-visible:border-fliptap-success/65 focus-visible:ring-fliptap-success/50',
    iconClass: 'group-hover:text-fliptap-success group-focus-visible:text-fliptap-success',
  },
  {
    rating: 4, label: 'Easy', Icon: Feather,
    surfaceClass: 'hover:bg-[color-mix(in_srgb,var(--fliptap-selection-border)_20%,var(--fliptap-surface))] hover:border-fliptap-selection-border focus-visible:bg-[color-mix(in_srgb,var(--fliptap-selection-border)_20%,var(--fliptap-surface))] focus-visible:border-fliptap-selection-border focus-visible:ring-fliptap-selection-border',
    iconClass: 'group-hover:text-[color-mix(in_srgb,var(--fliptap-selection-border)_60%,var(--fliptap-ink-brand))] group-focus-visible:text-[color-mix(in_srgb,var(--fliptap-selection-border)_60%,var(--fliptap-ink-brand))]',
  },
]

// The four recall metaphors share the app's rounded outline style without
// assigning an emotion to the learner. Clicking immediately calls onRate;
// there is no separate confirmation step. `suggested` is only a quiet hint
// from autoGrade and always remains overridable. `disabled` covers the brief
// async window while a grade is being recorded ('rating' phase).
export function RatingControls({
  selected,
  suggested,
  intervals,
  disabled,
  onRate,
  note,
}: {
  selected: Rating | null
  suggested?: Rating | null
  intervals: Record<Rating, string>
  disabled?: boolean
  onRate: (rating: Rating) => void
  note?: string
}) {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BUTTONS.map((b) => {
          const isSelected = selected === b.rating
          const isSuggested = !isSelected && suggested === b.rating
          const emphasized = isSelected || isSuggested
          return (
            <button
              key={b.rating}
              type="button"
              disabled={disabled}
              onClick={() => onRate(b.rating)}
              className={cn(
                'group flex min-h-[116px] flex-col items-center justify-center rounded-fliptap-control border bg-fliptap-surface px-2 py-4 text-center outline-none shadow-[0_1px_4px_rgba(23,32,51,0.08)] transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none hover:shadow-[0_3px_10px_rgba(23,32,51,0.10)] focus-visible:ring-2 focus-visible:ring-fliptap-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
                isSelected
                  ? 'border-fliptap-accent bg-fliptap-accent-softer'
                  : isSuggested
                    ? 'border-fliptap-accent'
                    : cn('border-fliptap-border', b.surfaceClass),
              )}
            >
              <b.Icon
                aria-hidden="true"
                strokeWidth={2}
                className={cn(
                  'mb-2.5 size-6 transition-colors duration-150 motion-reduce:transition-none',
                  emphasized ? 'text-fliptap-accent' : cn('text-fliptap-muted', b.iconClass),
                )}
              />
              <span className="text-base font-semibold leading-5 text-fliptap-ink-brand">
                {b.label}
              </span>
              <span className="mt-1.5 text-sm leading-5 text-fliptap-muted">
                {b.rating} <span aria-hidden="true">•</span> {intervals[b.rating]}
              </span>
            </button>
          )
        })}
      </div>
      {note && <p className="mt-2 text-xs text-fliptap-muted">{note}</p>}
    </div>
  )
}
