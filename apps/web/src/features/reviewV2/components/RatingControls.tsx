import type { Rating } from '@/types'
import { cn } from '@/lib/cn'
import {
  ChartNoAxesColumnIncreasing,
  ChevronsRight,
  CircleCheck,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'

const BUTTONS: { rating: Rating; label: string; Icon: LucideIcon }[] = [
  { rating: 1, label: 'Again', Icon: RefreshCw },
  { rating: 2, label: 'Hard', Icon: ChartNoAxesColumnIncreasing },
  { rating: 3, label: 'Good', Icon: CircleCheck },
  { rating: 4, label: 'Easy', Icon: ChevronsRight },
]

// The four reference-matched symbols describe the scheduling action without
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
                'flex min-h-[116px] flex-col items-center justify-center rounded-itera-control border bg-itera-surface px-2 py-4 text-center outline-none shadow-[0_1px_4px_rgba(23,32,51,0.08)] transition-[border-color,background-color,box-shadow] hover:border-itera-border-strong hover:shadow-[0_3px_10px_rgba(23,32,51,0.10)] focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
                isSelected
                  ? 'border-itera-accent bg-itera-accent-softer'
                  : isSuggested
                    ? 'border-itera-accent'
                    : 'border-itera-border',
              )}
            >
              <b.Icon
                aria-hidden="true"
                strokeWidth={2}
                className={cn(
                  'mb-2.5 size-6',
                  emphasized ? 'text-itera-accent' : 'text-itera-muted',
                )}
              />
              <span className="text-base font-semibold leading-5 text-itera-ink-brand">
                {b.label}
              </span>
              <span className="mt-1.5 text-sm leading-5 text-itera-muted">
                {b.rating} <span aria-hidden="true">•</span> {intervals[b.rating]}
              </span>
            </button>
          )
        })}
      </div>
      {note && <p className="mt-2 text-xs text-itera-muted">{note}</p>}
    </div>
  )
}
