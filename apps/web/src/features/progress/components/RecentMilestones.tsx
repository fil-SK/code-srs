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
  streak: 'bg-fliptap-accent-soft text-fliptap-accent',
  reviews: 'bg-fliptap-navy-soft text-fliptap-navy',
  retention: 'bg-fliptap-success-soft text-fliptap-success',
}

export function RecentMilestones({ events, limit = 4 }: { events: MilestoneEvent[]; limit?: number }) {
  const visible = events.slice(0, limit)

  return (
    <div className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 shadow-[var(--fliptap-shadow-card)]">
      <h3 className="text-base font-semibold text-fliptap-ink-brand">Recent milestones</h3>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-fliptap-muted">
          Keep reviewing — your first milestones will show up here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-fliptap-border">
          {visible.map((event) => {
            const Icon = TYPE_ICON[event.type]
            return (
              <li key={`${event.type}-${event.threshold}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn('grid h-9 w-9 flex-none place-items-center rounded-full', TYPE_TONE[event.type])}>
                  <Icon size={18} strokeWidth={2.15} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-fliptap-ink-brand">{event.title}</div>
                  <div className="truncate text-xs text-fliptap-muted">{event.subtitle}</div>
                </div>
                <span className="flex-none text-xs text-fliptap-muted">{formatEventDate(event.date)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
