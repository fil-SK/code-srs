import type { Millis, ReviewLog } from '../../types'
import { addCalendarDays, localDayIndex, startOfDay } from './calendarDay'

export type AchievementId = 'first-session' | 'five-days' | 'four-weeks' | 'comeback'

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  progress: number
  target: number
  progressLabel: string
  unlockedAt?: Millis
}

function weekIndex(at: Millis): number {
  const day = new Date(at).getDay()
  return localDayIndex(addCalendarDays(at, -((day + 6) % 7)))
}

// Lifetime evidence is independent of Progress's date filter. Past qualifying
// windows remain earned; Undo and replace-import deliberately change evidence.
// Older logs may prove due eligibility through the previous same-card dueAfter,
// but cannot prove session completion. No history is rewritten.
export function computeAchievements(logs: readonly ReviewLog[], now: Millis): Achievement[] {
  const sorted = logs.filter((log) => log.reviewedAt <= now)
    .slice().sort((a, b) => a.reviewedAt - b.reviewedAt || a.id.localeCompare(b.id))
  const previousByCard = new Map<string, ReviewLog>()
  const missedByCard = new Map<string, Millis>()
  const studyDays: { day: number; at: Millis }[] = []
  const weeks = new Set<number>()
  let firstSession: Millis | undefined
  let fiveDays: Millis | undefined
  let fourWeeks: Millis | undefined
  let comeback: Millis | undefined
  let windowStart = 0

  for (const log of sorted) {
    const previous = previousByCard.get(log.cardId)
    const due = log.dueBefore ?? previous?.dueAfter
    const scheduled = due !== undefined && log.reviewedAt >= due
    if (scheduled) {
      if (log.sessionCompleted && firstSession === undefined) firstSession = log.reviewedAt
      const day = localDayIndex(log.reviewedAt)
      if (studyDays.at(-1)?.day !== day) studyDays.push({ day, at: log.reviewedAt })
      while (studyDays[windowStart].day < day - 6) windowStart++
      if (studyDays.length - windowStart >= 5 && fiveDays === undefined) fiveDays = log.reviewedAt
      weeks.add(weekIndex(log.reviewedAt))
      if (weeks.size >= 4 && fourWeeks === undefined) fourWeeks = log.reviewedAt

      const missedAt = missedByCard.get(log.cardId)
      if (log.rating > 1 && missedAt !== undefined && day > localDayIndex(missedAt)) {
        if (comeback === undefined) comeback = log.reviewedAt
        missedByCard.delete(log.cardId)
      }
    }
    // A miss is useful input regardless of the rating of other cards. Same-day
    // retries never earn recovery; a later due review must demonstrate recall.
    if (log.rating === 1) missedByCard.set(log.cardId, log.reviewedAt)
    previousByCard.set(log.cardId, log)
  }

  const currentStart = localDayIndex(addCalendarDays(startOfDay(now), -6))
  const currentDays = studyDays.filter(({ day }) => day >= currentStart).length
  return [
    {
      id: 'first-session', title: 'First step',
      description: 'Complete your first scheduled review session.',
      progress: firstSession === undefined ? 0 : 1, target: 1,
      progressLabel: firstSession === undefined ? 'Your first session is ahead' : '1 session completed',
      unlockedAt: firstSession,
    },
    {
      id: 'five-days', title: 'Finding your rhythm',
      description: 'Study on five different days within any seven-day period.',
      progress: fiveDays === undefined ? Math.min(currentDays, 5) : 5, target: 5,
      progressLabel: fiveDays === undefined ? `${currentDays} of 5 days in the last 7 days` : '5 study days in 7 days',
      unlockedAt: fiveDays,
    },
    {
      id: 'four-weeks', title: 'Here to stay',
      description: 'Complete scheduled reviews in four different weeks.',
      progress: Math.min(weeks.size, 4), target: 4,
      progressLabel: `${Math.min(weeks.size, 4)} of 4 weeks`,
      unlockedAt: fourWeeks,
    },
    {
      id: 'comeback', title: 'It clicked',
      description: 'Recall a previously missed card on a later day, when it is due.',
      progress: comeback === undefined ? 0 : 1, target: 1,
      progressLabel: comeback !== undefined ? 'A missed card recalled' : missedByCard.size
        ? 'Return when a missed card is due' : 'Keep learning; misses are part of it',
      unlockedAt: comeback,
    },
  ]
}

// Compare the committed session with history excluding its own ids, so delayed
// query invalidation cannot duplicate logs or hide a newly earned milestone.
export function sessionAchievementUnlocks(
  history: readonly ReviewLog[], session: readonly ReviewLog[], now: Millis,
): Achievement[] {
  const ids = new Set(session.map((log) => log.id))
  const before = history.filter((log) => !ids.has(log.id))
  const earned = new Set(computeAchievements(before, now)
    .filter((item) => item.unlockedAt !== undefined).map((item) => item.id))
  return computeAchievements([...before, ...session], now)
    .filter((item) => item.unlockedAt !== undefined && !earned.has(item.id))
}
// Called before persistence: the final grade and completion are one fact.
// Retrying passes the same log; Undo removes both together.
export function withSessionCompletion(
  log: ReviewLog, preceding: readonly ReviewLog[], finalCard: boolean,
): ReviewLog {
  const scheduled = [...preceding, log].every(
    (item) => item.dueBefore !== undefined && item.dueBefore <= item.reviewedAt,
  )
  return finalCard && scheduled ? { ...log, sessionCompleted: true } : log
}
