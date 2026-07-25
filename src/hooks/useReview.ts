import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, ID, Rating, ReviewLog, SchedulingState } from '@/types'
import { getRepository } from '@/data'
import { buildReviewLog, reviewState } from '@/domain/scheduling/scheduler'
import { cardStateFromCard } from '@/domain/scheduling/cardState'
import { qk } from './queryKeys'

const repo = getRepository()

export function useReviewLogs() {
  return useQuery({ queryKey: qk.reviewsAll, queryFn: () => repo.reviews.all() })
}

export interface GradeInput {
  card: Card
  rating: Rating
  durationMs: number
  autoGraded: boolean
}

// Apply a grade: compute next scheduling, persist the updated card, append the log.
export function useGradeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, rating, durationMs, autoGraded }: GradeInput) => {
      const now = Date.now()
      const after = reviewState(card.scheduling, rating, now)
      const log = buildReviewLog({
        cardId: card.id,
        before: card.scheduling,
        after,
        rating,
        autoGraded,
        durationMs,
        now,
      })
      const graded = { ...card, scheduling: after, updatedAt: now }
      await repo.cards.put(graded)
      await repo.cardStates.put(cardStateFromCard(graded)) // dual-write, Phase D
      await repo.reviews.append(log)
      return { log }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.reviewsAll })
    },
  })
}

export interface PersistReviewResultInput {
  card: Card // the original v1 card; only `scheduling`/`updatedAt` change
  after: SchedulingState
  log: ReviewLog
}

// Persists a v2 Review shell's already-computed grading result onto the real
// v1 Card.scheduling (still the source of truth — CardState's read cutover,
// Phase D step 5, hasn't happened). Takes `{after, log}` rather than
// recomputing them (reviewService.submit already calls the same
// reviewState/buildReviewLog `useGradeCard` calls above), so the v1 and v2
// Review paths can't silently compute divergent results — this hook only
// ever writes what reviewService already decided. See itera-decisions.md.
export function usePersistReviewResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, after, log }: PersistReviewResultInput) => {
      const graded = { ...card, scheduling: after, updatedAt: Date.now() }
      await repo.cards.put(graded)
      await repo.cardStates.put(cardStateFromCard(graded)) // dual-write, Phase D
      await repo.reviews.append(log)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.reviewsAll })
    },
  })
}

export interface UndoInput {
  card: Card // the original card, restored verbatim
  logId: ID
}

// Reverse the most recent grade: restore the original card and remove its
// log. CardState is restored to match — dual-write means undo must stay
// correct under it too (docs/itera-migration-plan.md §9), not just the
// forward grading path.
export function useUndoGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, logId }: UndoInput) => {
      await repo.cards.put(card)
      await repo.cardStates.put(cardStateFromCard(card)) // dual-write, Phase D
      await repo.reviews.delete(logId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.reviewsAll })
    },
  })
}
