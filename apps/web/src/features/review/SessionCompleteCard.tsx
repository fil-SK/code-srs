import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Sprout, Undo2, type LucideIcon } from 'lucide-react'
import {
  formatInterval,
  formatSessionDuration,
  pickSessionCompleteLine,
  type SessionSummary,
} from '@itera/core'
import type { Rating } from '@/types'
import { cn } from '@/lib/cn'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'

// The end of the core loop, and the surface a learner sees more often than any
// other single screen. It reports the session and nothing else: every value
// comes from `summarizeSession` over the ReviewLogs this session actually
// wrote, so there is no score, no points and no second progression model
// beside FSRS (docs/itera-decisions.md D209/D210).
//
// Deliberately NOT here: any figure the data does not support. A session with
// no mature card shows no recall percentage rather than a flattering 100%, and
// the streak line says "still going" unless this session is what moved it.

const RATING_BARS: { rating: Rating; label: string; tone: string }[] = [
  // Neutral by construction. RatingControls refuses to assign an emotion to the
  // learner, so this refuses the matching traffic-light; Review history set the
  // same precedent - a slate ramp throughout, the palest accent tint on Again
  // alone, because Again is the only grade that changes what happens next.
  { rating: 1, label: 'Again', tone: 'bg-itera-accent/50' },
  { rating: 2, label: 'Hard', tone: 'bg-itera-navy/30' },
  { rating: 3, label: 'Good', tone: 'bg-itera-navy/60' },
  { rating: 4, label: 'Easy', tone: 'bg-itera-navy/85' },
]

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-2 text-center">
      <div className="text-[26px] font-semibold leading-none tracking-tight text-itera-ink-brand">
        {value}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-itera-muted">
        {label}
      </div>
    </div>
  )
}

// One bar for the whole session, split by grade, with a legend beneath. A
// single bar states the shape of the session at a glance; four separate meters
// would only invite comparing each grade against an imaginary target.
function RatingBreakdown({ counts, total }: { counts: Record<Rating, number>; total: number }) {
  return (
    <div className="mt-6">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-itera-pill bg-itera-navy-soft">
        {RATING_BARS.map(({ rating, tone }) => {
          const share = total > 0 ? (counts[rating] ?? 0) / total : 0
          if (share === 0) return null
          return (
            <div
              key={rating}
              className={cn('h-full first:rounded-l-itera-pill last:rounded-r-itera-pill', tone)}
              style={{ width: `${share * 100}%` }}
            />
          )
        })}
      </div>
      <ul className="mt-3.5 grid grid-cols-4 gap-2">
        {RATING_BARS.map(({ rating, label, tone }) => (
          <li key={rating} className="flex items-center justify-center gap-1.5 text-sm">
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', tone)} />
            <span className="font-semibold text-itera-ink-brand">{counts[rating] ?? 0}</span>
            <span className="text-itera-muted">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Fact({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-itera-ink">
      <Icon aria-hidden="true" size={16} className="shrink-0 text-itera-muted" />
      <span>{children}</span>
    </li>
  )
}

export function SessionCompleteCard({
  summary,
  completedAt,
  canUndo,
  busy,
  undoError,
  onUndo,
}: {
  summary: SessionSummary
  // Fixed when the session ended, so neither the copy nor the next-due label
  // drifts while the learner sits on this screen.
  completedAt: number
  canUndo: boolean
  busy: boolean
  undoError: string | null
  onUndo: () => void
}) {
  const line = useMemo(() => pickSessionCompleteLine(summary, completedAt), [summary, completedAt])

  return (
    <div className="mx-auto w-full max-w-xl px-4">
      <div className="itera-complete-in rounded-itera-card border border-itera-border bg-itera-surface px-6 py-9 shadow-[var(--itera-shadow-card)] sm:px-9">
        {/* The layered-card mark. A completion moment is one of the few places
            docs/design-system.md sanctions this motif; kept small, low-contrast
            and static, so it marks the moment rather than performing. Offsets
            are wide enough that the three layers read as a stack rather than as
            one shape with a smudge behind it. */}
        <div aria-hidden="true" className="mx-auto mb-6 h-[52px] w-[88px]">
          <div className="relative h-full w-full">
            <span className="absolute left-[34px] top-0 h-[38px] w-[52px] rotate-[10deg] rounded-[8px] bg-itera-navy/20" />
            <span className="absolute left-[17px] top-[5px] h-[38px] w-[52px] rotate-[5deg] rounded-[8px] bg-itera-navy/45" />
            <span className="absolute left-0 top-[11px] h-[38px] w-[52px] rounded-[8px] bg-itera-navy" />
          </div>
        </div>

        <h1 className="text-center text-[28px] font-bold leading-tight tracking-tight text-itera-ink-brand">
          Session complete
        </h1>
        {/* The numbers below are laid out visually; this states the headline
            result once, as a sentence, for anyone reading linearly. */}
        <p className="sr-only">
          Reviewed {summary.reviewed} {summary.reviewed === 1 ? 'card' : 'cards'}.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-center text-[15px] leading-relaxed text-itera-muted">
          {line}
        </p>

        <div className="itera-complete-in-delayed">
          <div className="mt-7 flex items-stretch rounded-itera-control border border-itera-border bg-itera-surface-subtle py-5">
            <Metric value={String(summary.reviewed)} label="Reviewed" />
            <div className="w-px self-stretch bg-itera-border" />
            <Metric
              value={
                summary.recalled === null ? '—' : `${Math.round(summary.recalled * 100)}%`
              }
              label="Recalled"
            />
            <div className="w-px self-stretch bg-itera-border" />
            <Metric value={formatSessionDuration(summary.focusMs)} label="Focus" />
          </div>

          <RatingBreakdown counts={summary.ratingCounts} total={summary.reviewed} />

          <ul className="mt-7 space-y-2.5 border-t border-itera-border pt-6">
            <Fact Icon={StreakFlameIcon}>
              <span className="font-semibold text-itera-ink-brand">
                {summary.streak.days}-day streak
              </span>{' '}
              {summary.streak.extendedToday ? 'extended today' : 'still going'}
            </Fact>
            {summary.firstTimeLearned > 0 && (
              <Fact Icon={Sprout}>
                <span className="font-semibold text-itera-ink-brand">
                  {summary.firstTimeLearned}
                </span>{' '}
                {summary.firstTimeLearned === 1 ? 'card' : 'cards'} seen for the first time
              </Fact>
            )}
            {summary.nextDueAt !== null && (
              <Fact Icon={CalendarClock}>
                Next card back in{' '}
                <span className="font-semibold text-itera-ink-brand">
                  {formatInterval(completedAt, summary.nextDueAt)}
                </span>
              </Fact>
            )}
          </ul>
        </div>

        {undoError && (
          <p role="alert" className="mt-4 text-sm leading-relaxed text-itera-error">
            {undoError}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-itera-control border border-itera-border bg-itera-surface px-5 text-sm font-semibold text-itera-ink transition-colors hover:border-itera-border-strong hover:bg-itera-surface-subtle disabled:pointer-events-none disabled:opacity-40"
            >
              <Undo2 size={15} /> Undo last
            </button>
          )}
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-itera-control bg-itera-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-itera-accent-hover"
          >
            Back to Today
          </Link>
        </div>
      </div>
    </div>
  )
}
