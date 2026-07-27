import { Flame } from 'lucide-react'

// Illustrative only, matching Today's MomentumPanel ("7-day streak" row,
// explicitly commented there as placeholder) - there is no real streak
// concept in the domain layer yet (no day-over-day review-log aggregation
// wired up anywhere). Shown here because product feedback asked for the
// fire-icon treatment in the top nav specifically, not because a real number
// exists to back it; swap for a real computed value once that exists.
export function StreakBadge() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-itera-ink-brand">
      <Flame size={16} className="text-itera-accent" />
      <span>7</span>
      <span className="hidden font-normal text-itera-muted sm:inline">day streak</span>
    </div>
  )
}
