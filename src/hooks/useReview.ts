import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, ID, Rating, ReviewLog, SchedulingState } from '@/types'
import { getRepository } from '@/data'
import { buildReviewLog, reviewState } from '@/domain/scheduling/scheduler'
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
  card: Card // the original card; only `scheduling`/`updatedAt` change
  after: SchedulingState
  log: ReviewLog
}

// Persists the Review shell's already-computed grading result onto the card's
// embedded scheduling. Takes `{after, log}` rather than recomputing them
// (reviewService.submit already produced both), so the session and this hook
// can't silently diverge — it only ever writes what reviewService decided.
export function usePersistReviewResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, after, log }: PersistReviewResultInput) => {
      const graded = { ...card, scheduling: after, updatedAt: Date.now() }
      await repo.cards.put(graded)
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

// Reverse the most recent grade: restore the original card verbatim and
// remove its log.
export function useUndoGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, logId }: UndoInput) => {
      await repo.cards.put(card)
      await repo.reviews.delete(logId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.reviewsAll })
    },
  })
}
