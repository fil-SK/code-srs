import { cn } from '@/lib/cn'

export type PreviewRating = 1 | 2 | 3 | 4 // Again | Hard | Good | Easy

const BUTTONS: { rating: PreviewRating; label: string }[] = [
  { rating: 1, label: 'Again' },
  { rating: 2, label: 'Hard' },
  { rating: 3, label: 'Good' },
  { rating: 4, label: 'Easy' },
]

// Rendered only after reveal (the caller controls mounting, not a `disabled`
// flag) per spec §16.3-16.4: four plain, restrained buttons — no rainbow, no
// emotion icons. This is a design preview: rating is not persisted anywhere,
// so clicking just highlights the choice, honestly labeled as such (mirrors
// this codebase's existing "preview, nothing recorded" convention).
export function RatingControls({
  selected,
  onRate,
}: {
  selected: PreviewRating | null
  onRate: (rating: PreviewRating) => void
}) {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-4 gap-2.5">
        {BUTTONS.map((b) => (
          <button
            key={b.rating}
            type="button"
            onClick={() => onRate(b.rating)}
            className={cn(
              'rounded-itera-control border px-2 py-3 text-center text-sm font-semibold transition-colors',
              selected === b.rating
                ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                : 'border-itera-border bg-itera-surface text-itera-ink hover:border-itera-border-strong',
            )}
          >
            {b.label}
            <span className="ml-1 font-mono text-xs text-itera-muted">
              {b.rating}
            </span>
          </button>
        ))}
      </div>
      {selected != null && (
        <p className="mt-2 text-xs text-itera-muted">
          Preview only — nothing recorded.
        </p>
      )}
    </div>
  )
}
