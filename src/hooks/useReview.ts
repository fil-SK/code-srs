import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, ID, Rating } from '@/types'
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
      await repo.cards.put({ ...card, scheduling: after, updatedAt: now })
      await repo.reviews.append(log)
      return { log }
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

// Reverse the most recent grade: restore the original card and remove its log.
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
