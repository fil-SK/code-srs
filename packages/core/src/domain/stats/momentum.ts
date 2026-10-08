import type { Millis, ReviewLog } from '../../types'
import { computeAchievements, selectNextAchievement, type Achievement } from './achievements'
import { computeStreak, type StreakSummary } from './streak'
import { computePaceSeries, type PaceDay } from './todayMetrics'

export interface MomentumDay extends PaceDay {
  dateLabel: string
  studied: boolean
}

export interface MomentumSummary {
  streak: StreakSummary
  status: string
  days: MomentumDay[]
  nextAchievement: Achievement | undefined
  earnedCount: number
}

const DAY_LABEL = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

// Reuse the canonical day buckets and streak. Activity includes any review;
// achievement eligibility remains the stricter scheduled-review definition.
export function computeMomentum(logs: ReviewLog[], now: Millis, dueCount: number): MomentumSummary {
  const history = logs.filter((log) => log.reviewedAt <= now)
  const streak = computeStreak(history, now)
  const achievements = computeAchievements(history, now)
  const status = streak.activeToday
    ? "You've studied today."
    : dueCount === 0
      ? 'No cards due. Return when your next card is ready.'
      : streak.current > 0
        ? 'Review today to keep it going.'
        : 'Review a card to start your streak.'

  return {
    streak,
    status,
    days: computePaceSeries(history, now).map((day) => ({
      ...day,
      dateLabel: DAY_LABEL.format(new Date(day.date)),
      studied: day.count > 0,
    })),
    nextAchievement: selectNextAchievement(achievements),
    earnedCount: achievements.filter((item) => item.unlockedAt !== undefined).length,
  }
}
