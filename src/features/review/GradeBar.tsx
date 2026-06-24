import { useMemo } from 'react'
import type { Card, Rating } from '@/types'
import { previewStates } from '@/domain/scheduling/scheduler'
import { formatInterval } from '@/domain/scheduling/format'
import { cn } from '@/lib/cn'

const BUTTONS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: 'Again', className: 'hover:border-red [&_b]:text-red' },
  { rating: 2, label: 'Hard', className: 'hover:border-amber [&_b]:text-amber' },
  { rating: 3, label: 'Good', className: 'hover:border-green [&_b]:text-green' },
  { rating: 4, label: 'Easy', className: 'hover:border-blue [&_b]:text-blue' },
]

export function GradeBar({
  card,
  disabled,
  suggested,
  onGrade,
}: {
  card: Card
  disabled?: boolean
  suggested?: Rating // auto-grade suggestion to highlight (user can still override)
  onGrade: (rating: Rating) => void
}) {
  // Preview is computed once per card; "now" is fixed at render for stable labels.
  const labels = useMemo(() => {
    const now = Date.now()
    const preview = previewStates(card.scheduling, now)
    return {
      1: formatInterval(now, preview[1].due),
      2: formatInterval(now, preview[2].due),
      3: formatInterval(now, preview[3].due),
      4: formatInterval(now, preview[4].due),
    } as Record<Rating, string>
  }, [card])

  return (
    <div className="mt-5 grid grid-cols-4 gap-2.5">
      {BUTTONS.map((b) => (
        <button
          key={b.rating}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(b.rating)}
          className={cn(
            'rounded-[10px] border bg-panel-2 px-2 py-3 text-center disabled:pointer-events-none disabled:opacity-50',
            b.className,
            suggested === b.rating
              ? 'border-accent ring-1 ring-accent'
              : 'border-border',
          )}
        >
          <b className="block text-sm font-semibold">
            {b.label}
            {suggested === b.rating ? ' ✓' : ''}
          </b>
          <small className="text-[11px] text-faint">{labels[b.rating]}</small>
        </button>
      ))}
    </div>
  )
}
