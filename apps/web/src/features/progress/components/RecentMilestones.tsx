import { Target, Trophy, type LucideIcon } from 'lucide-react'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'
import type { MilestoneEvent, MilestoneType } from '@/domain/stats/progressMetrics'
import { formatEventDate } from '@/domain/stats/dateRange'
import { cn } from '@/lib/cn'

const TYPE_ICON: Record<MilestoneType, LucideIcon> = {
  streak: StreakFlameIcon,
  reviews: Target,
  retention: Trophy,
}

const TYPE_TONE: Record<MilestoneType, string> = {
  streak: 'bg-itera-accent-soft text-itera-accent',
  reviews: 'bg-itera-navy-soft text-itera-navy',
  retention: 'bg-itera-success-soft text-itera-success',
}

export function RecentMilestones({ events, limit = 4 }: { events: MilestoneEvent[]; limit?: number }) {
  const visible = events.slice(0, limit)

  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <h3 className="text-base font-semibold text-itera-ink-brand">Recent milestones</h3>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-itera-muted">
          Keep reviewing — your first milestones will show up here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-itera-border">
          {visible.map((event) => {
            const Icon = TYPE_ICON[event.type]
            return (
              <li key={`${event.type}-${event.threshold}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn('grid h-9 w-9 flex-none place-items-center rounded-full', TYPE_TONE[event.type])}>
                  <Icon size={18} strokeWidth={2.15} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-itera-ink-brand">{event.title}</div>
                  <div className="truncate text-xs text-itera-muted">{event.subtitle}</div>
                </div>
                <span className="flex-none text-xs text-itera-muted">{formatEventDate(event.date)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
