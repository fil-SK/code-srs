import type { Rating } from '@/types'
import { cn } from '@/lib/cn'

const BUTTONS: { rating: Rating; label: string }[] = [
  { rating: 1, label: 'Again' },
  { rating: 2, label: 'Hard' },
  { rating: 3, label: 'Good' },
  { rating: 4, label: 'Easy' },
]

// Four plain, restrained buttons — no rainbow, no emotion icons (spec
// §16.3-16.4). Rendered only once feedback exists (the caller controls
// mounting). Clicking immediately calls onRate — there is no separate
// "confirm" step, matching v1's GradeBar. `suggested` shows a quiet hint from
// autoGrade's objective result; it never auto-selects anything — the learner
// always makes the actual choice (spec §9.4: correctness and FSRS rating are
// separate, a recommendation must stay overridable). `disabled` covers the
// brief async window while a grade is being recorded ('rating' phase).
export function RatingControls({
  selected,
  suggested,
  disabled,
  onRate,
  note,
}: {
  selected: Rating | null
  suggested?: Rating | null
  disabled?: boolean
  onRate: (rating: Rating) => void
  note?: string
}) {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-4 gap-2.5">
        {BUTTONS.map((b) => {
          const isSelected = selected === b.rating
          const isSuggested = !isSelected && suggested === b.rating
          return (
            <button
              key={b.rating}
              type="button"
              disabled={disabled}
              onClick={() => onRate(b.rating)}
              className={cn(
                'rounded-itera-control border px-2 py-3 text-center text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60',
                isSelected
                  ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                  : isSuggested
                    ? 'border-itera-accent/50 bg-itera-surface text-itera-ink'
                    : 'border-itera-border bg-itera-surface text-itera-ink hover:border-itera-border-strong',
              )}
            >
              {b.label}
              <span className="ml-1 font-mono text-xs text-itera-muted">
                {b.rating}
              </span>
            </button>
          )
        })}
      </div>
      {note && <p className="mt-2 text-xs text-itera-muted">{note}</p>}
    </div>
  )
}
