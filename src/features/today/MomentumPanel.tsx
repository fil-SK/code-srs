import { Link } from 'react-router-dom'
import { CalendarClock, Flag, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'
import type { NextMilestone } from '@/domain/stats/todayMetrics'
import { formatDayCount } from '@/domain/stats/streak'

function MetricIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-itera-accent-soft text-itera-accent">
      <Icon size={15} aria-hidden="true" />
    </div>
  )
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100)

  return (
    <div
      className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-itera-pill bg-itera-border"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div
        className="h-full rounded-itera-pill bg-itera-accent"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export interface MomentumPanelProps {
  /** From the one canonical streak calculation (domain/stats/streak). */
  streak: number
  /** Shared with Progress (domain/stats/progressMetrics), 0-1, or null. */
  retention: number | null
  /** The same due count the hero and /review use. */
  dueCount: number
  milestone: NextMilestone | null
}

// Four real rows. The composition is the one from the supplied dashboard
// direction (grouped icon metrics, no per-row dividers, one divider above Next
// milestone) - only the values changed, from illustrative constants to data.
//
// Weekly goal used to sit in row 2 ("4 of 5 sessions"). It was removed rather
// than computed: there is no goal concept anywhere in this product, so any
// number there would have been invented. Retention took its slot, so the row
// order and rhythm are unchanged.
export function MomentumPanel({ streak, retention, dueCount, milestone }: MomentumPanelProps) {
  return (
    <section
      aria-labelledby="momentum-heading"
      className="flex min-h-[345px] flex-col rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]"
    >
      <h2 id="momentum-heading" className="text-base font-semibold text-itera-ink-brand">
        Momentum
      </h2>

      <div className="mt-5 flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-3">
          <MetricIcon icon={StreakFlameIcon} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-itera-ink-brand">Current streak</div>
            <div className="mt-0.5 text-xs text-itera-muted">
              {streak === 0
                ? 'Review a card to start one'
                : `${formatDayCount(streak)} in a row`}
            </div>
          </div>
          <div className="text-2xl leading-none font-semibold text-itera-ink-brand">{streak}</div>
        </div>

        {/* "Retention", not "Recall rate": this is the shared Progress
            calculation over mature attempts whose required stateBefore is
            review or relearning. */}
        <div className="flex items-center gap-3">
          <MetricIcon icon={Target} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-itera-ink-brand">Retention</div>
            <div className="mt-0.5 text-xs text-itera-muted">
              {retention === null ? 'No mature reviews yet' : 'Last 30 days'}
            </div>
          </div>
          {/* An em dash, never 0%, when there is nothing to measure - 0% would
              read as "you failed every card". */}
          <div className="text-sm font-bold text-itera-ink-brand">
            {retention === null ? '—' : `${Math.round(retention * 100)}%`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MetricIcon icon={CalendarClock} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-itera-ink-brand">Due today</div>
            <div className="mt-0.5 text-xs text-itera-muted">
              {dueCount === 0 ? 'Nothing waiting' : 'Ready to review'}
            </div>
          </div>
          <div className="text-sm font-bold text-itera-ink-brand">{dueCount}</div>
        </div>

        <div className="mt-auto border-t border-itera-border pt-4">
          <div className="mb-3 text-xs font-semibold text-itera-ink-brand">Next milestone</div>
          <MilestoneRow milestone={milestone} />
        </div>
      </div>
    </section>
  )
}

// A derived, unpersisted continuation target (domain/stats/todayMetrics).
// "Learned" means exactly one thing here - a current, non-suspended card with
// at least one review - so the copy says "cards learned" and never "mastered".
function MilestoneRow({ milestone }: { milestone: NextMilestone | null }) {
  if (!milestone) {
    return (
      <div className="flex items-center gap-3">
        <MetricIcon icon={Flag} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">All caught up</div>
          <div className="mt-1 text-xs text-itera-muted">
            Every active card has been reviewed at least once.
          </div>
        </div>
      </div>
    )
  }

  const title =
    milestone.kind === 'finish-deck'
      ? `Finish ${milestone.name}`
      : milestone.kind === 'start-deck'
        ? `Start ${milestone.name}`
        : `Review ${milestone.name}`

  const body = (
    <div className="flex items-center gap-3">
      <MetricIcon icon={Flag} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-itera-ink-brand">{title}</div>
        {milestone.kind === 'finish-deck' ? (
          <div className="mt-1 flex items-center gap-4">
            <span className="flex-none text-xs text-itera-muted">
              {milestone.learned} of {milestone.total} cards learned
            </span>
            <ProgressBar
              label={`${milestone.name} learned progress`}
              value={milestone.learned / milestone.total}
            />
          </div>
        ) : (
          // No bar: a due count has no honest denominator to draw against.
          <div className="mt-1 text-xs text-itera-muted">
            {milestone.dueCount} {milestone.dueCount === 1 ? 'card' : 'cards'} due
          </div>
        )}
      </div>
    </div>
  )

  // A deck can be in progress with nothing due right now, so the row only
  // offers a review session when one actually exists - otherwise it opens the
  // deck. It never advertises a session it cannot start.
  return (
    <Link
      to={milestone.dueCount > 0 ? `/review?deck=${milestone.deckId}` : `/decks/${milestone.deckId}`}
      className="block rounded-itera-control outline-none focus-visible:ring-2 focus-visible:ring-itera-accent"
    >
      {body}
    </Link>
  )
}
