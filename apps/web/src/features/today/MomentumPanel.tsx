import { Check, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MomentumSummary } from '@fliptap/core'
import { RetentionIcon } from '@/components/icons/ApprovedIcons'
import { AchievementIcon } from '@/components/icons/AchievementIcon'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'
import { cn } from '@/lib/cn'

export interface MomentumPanelProps {
  momentum: MomentumSummary
  /** Mature-review retention over the same trailing 30 days as Progress. */
  retention: number | null
}

// Today fetches and computes everything. This panel presents one focal streak,
// its real recent days, a supporting metric and the shared next achievement.
export function MomentumPanel({ momentum, retention }: MomentumPanelProps) {
  const { streak, status, days, nextAchievement, earnedCount } = momentum

  return (
    <section aria-labelledby="momentum-heading"
      className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 shadow-[var(--fliptap-shadow-card)]">
      <h2 id="momentum-heading" className="text-base font-semibold text-fliptap-ink-brand">Momentum</h2>

      <div className="mt-4 rounded-fliptap-control bg-fliptap-accent-softer px-4 py-3">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-fliptap-accent-soft text-fliptap-accent">
            <StreakFlameIcon size={30} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="flex items-baseline gap-2 text-fliptap-ink-brand">
              <span className="text-[36px] leading-none font-semibold tracking-tight tabular-nums">{streak.current}</span>
              <span className="text-sm font-semibold">day streak</span>
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-fliptap-muted">{status}</p>
          </div>
        </div>

        <ol aria-label="Study activity over the last seven days" className="mt-3 grid grid-cols-7 gap-2">
          {days.map((day) => (
            <li key={day.date} title={`${day.dateLabel}: ${day.studied ? 'Studied' : 'No reviews'}${day.isToday ? ' (Today)' : ''}`}
              data-studied={day.studied} data-today={day.isToday}
              className="flex min-w-0 flex-col items-center gap-1.5">
              <span aria-hidden="true" className={cn('text-[11px] font-medium', day.isToday ? 'text-fliptap-ink-brand' : 'text-fliptap-muted')}>
                {day.isToday ? 'Today' : day.label}
              </span>
              <span aria-hidden="true" className={cn('grid size-7 place-items-center rounded-full',
                day.studied ? 'bg-fliptap-ink-brand text-fliptap-surface' : 'border border-fliptap-border-strong bg-fliptap-surface/70',
                day.isToday && 'ring-2 ring-fliptap-accent/60 ring-offset-2 ring-offset-fliptap-accent-softer')}>
                {day.studied ? <Check size={14} strokeWidth={2.5} /> : <span className="size-1 rounded-full bg-fliptap-border-strong" />}
              </span>
              <span className="sr-only">{day.dateLabel}: {day.studied ? 'Studied' : 'No reviews'}{day.isToday ? ', Today' : ''}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-fliptap-muted">Last 7 days</p>
      </div>

      <div className="my-3 flex items-center gap-2.5">
        <RetentionIcon size={18} aria-hidden="true" className="shrink-0 text-fliptap-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fliptap-ink-brand">Retention</p>
          <p className="mt-0.5 text-[11px] text-fliptap-muted">{retention === null ? 'No mature reviews yet' : 'Last 30 days'}</p>
        </div>
        <span className="text-lg font-semibold text-fliptap-ink-brand tabular-nums">{retention === null ? '—' : `${Math.round(retention * 100)}%`}</span>
      </div>

      <div className="border-t border-fliptap-border pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-fliptap-ink-brand">{nextAchievement ? 'Next achievement' : 'Your achievements'}</h3>
          <span className="text-[11px] text-fliptap-muted">{earnedCount} of 4 earned</span>
        </div>
        <Link to="/progress" className="group -mx-2 flex items-start gap-3 rounded-fliptap-control px-2 py-1.5 outline-none transition-colors hover:bg-fliptap-surface-subtle focus-visible:ring-2 focus-visible:ring-fliptap-accent">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-fliptap-border bg-fliptap-navy-soft text-fliptap-ink-brand">
            <AchievementIcon id={nextAchievement?.id ?? 'four-weeks'} size={32} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fliptap-ink-brand">{nextAchievement?.title ?? 'All four earned'}</p>
            <p className={nextAchievement ? "sr-only" : "mt-1 text-xs leading-relaxed text-fliptap-muted"}>{nextAchievement?.description ?? 'Your study milestones are in Progress.'}</p>
            {nextAchievement && (
              <>
                <div role="progressbar" aria-label={nextAchievement.title} aria-valuemin={0} aria-valuemax={nextAchievement.target}
                  aria-valuenow={nextAchievement.progress} aria-valuetext={nextAchievement.progressLabel}
                  className="mt-2.5 h-1 overflow-hidden rounded-full bg-fliptap-navy-soft">
                  <div className="h-full rounded-full bg-fliptap-ink-brand/60" style={{ width: `${nextAchievement.progress / nextAchievement.target * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-fliptap-muted">{nextAchievement.progressLabel}</p>
              </>
            )}
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-fliptap-ink-brand">
              View achievements <ChevronRight size={13} aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  )
}
