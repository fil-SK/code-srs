import { useMemo } from 'react'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'
import { Skeleton } from '@/components/ui/Skeleton'
import { computeStreak } from '@/domain/stats/streak'
import { useReviewLogs } from '@/hooks/useReview'

// The top nav's compact streak. It hard-coded 7 until Milestone 2; it now
// reads the one canonical calculation (domain/stats/streak), the same one
// Today's Momentum panel and Progress's KPI tile use, so the three surfaces
// can present the number differently but can never disagree about it.
//
// A zero streak is shown rather than hidden: the badge disappearing and
// reappearing would be a stranger signal than an honest 0.
//
// That rule is about a *loaded* zero. Before the logs resolve there is no
// streak to be honest about, and rendering `0 day streak` on every cold load
// only to snap to the real number is the flash this placeholder removes. The
// flame and the label stay put, so nothing moves when the number lands.
export function StreakBadge() {
  const logs = useReviewLogs()
  const streak = useMemo(() => computeStreak(logs.data ?? []).current, [logs.data])
  const pending = logs.isLoading

  return (
    <div className="flex shrink-0 items-center gap-2">
      <StreakFlameIcon size={24} className="text-itera-accent" />
      <div className="hidden leading-tight sm:block">
        {pending ? (
          <Skeleton className="mb-1 mt-0.5 h-3.5 w-6 rounded-itera-pill" />
        ) : (
          <div className="text-base font-bold text-itera-ink-brand">{streak}</div>
        )}
        <div className="text-xs text-itera-muted">day streak</div>
      </div>
      {pending ? (
        <Skeleton className="h-3.5 w-4 rounded-itera-pill sm:hidden" />
      ) : (
        <span className="text-sm font-semibold text-itera-ink-brand sm:hidden">{streak}</span>
      )}
    </div>
  )
}
