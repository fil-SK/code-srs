import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'

// Illustrative only, matching Today's MomentumPanel ("7-day streak" row,
// explicitly commented there as placeholder) - there is no real streak
// concept in the domain layer yet (no day-over-day review-log aggregation
// wired up anywhere). Shown here because product feedback asked for the
// fire-icon treatment in the top nav specifically, not because a real number
// exists to back it; swap for a real computed value once that exists.
export function StreakBadge() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <StreakFlameIcon size={24} className="text-itera-accent" />
      <div className="hidden leading-tight sm:block">
        <div className="text-base font-bold text-itera-ink-brand">7</div>
        <div className="text-xs text-itera-muted">day streak</div>
      </div>
      <span className="text-sm font-semibold text-itera-ink-brand sm:hidden">7</span>
    </div>
  )
}
