import type { Rating } from '@/types'
import { cn } from '@/lib/cn'

// Again/Hard/Good/Easy are FSRS self-assessments, not error/warning/success
// states: a Hard review is not a warning, and Itera's grading model already
// keeps objective correctness separate from the rating a card is scheduled by.
// So these are deliberately NOT a danger/warning/success/accent set - a
// paginated table of saturated chips would read as an Anki rainbow, which the
// Review UI has been moving away from. Rank is carried by ink weight and
// surface depth plus the numeral, not by hue.
//
// The single exception is Again, which gets the palest accent tint: a lapse is
// the one thing a review log is actually scanned for, and with four fully
// neutral pills it was unfindable at a glance. Emphasis, not an error state -
// the ink stays neutral so it reads as a highlight rather than an alarm.
const RATING_META: Record<Rating, { label: string; className: string }> = {
  1: { label: 'Again', className: 'border-transparent bg-itera-accent-soft text-itera-ink-brand' },
  2: { label: 'Hard', className: 'border-itera-border bg-itera-surface text-itera-muted' },
  3: { label: 'Good', className: 'border-itera-border bg-itera-surface-subtle text-itera-ink' },
  4: {
    label: 'Easy',
    className: 'border-transparent bg-itera-navy-soft text-itera-ink-brand',
  },
}

export function RatingPill({ rating }: { rating: Rating }) {
  const meta = RATING_META[rating]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-itera-pill border px-2 py-0.5 text-xs font-semibold',
        meta.className,
      )}
    >
      {meta.label}
      <span className="text-[10px] font-bold tabular-nums opacity-55">{rating}</span>
    </span>
  )
}
