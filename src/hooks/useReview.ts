import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, ID, ReviewLog, SchedulingState } from '@/types'
import { getRepository } from '@/data'
import type { WriteGuarantee } from '@/data/repository'
import { qk } from './queryKeys'

const repo = getRepository()

export function useReviewLogs() {
  return useQuery({ queryKey: qk.reviewsAll, queryFn: () => repo.reviews.all() })
}

// What the live backend can promise for a review write, so failure copy can
// state it instead of guessing. Mirrors canReplaceImport() in src/data/backup.ts:
// the UI reads one value and never branches on which backend is live.
export function reviewWriteGuarantee(): WriteGuarantee {
  return repo.reviewGuarantee
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
//
// The card and the log go down as one `commitReview`, not as `cards.put` then
// `reviews.append`: those were two commits, and a failure between them advanced
// scheduling with no history row behind it (audit §10 item 6).
//
// Invalidation stays onSuccess-only. A rejected commit rolled back on both
// backends, so there is nothing new to read and announcing otherwise would make
// the cache disagree with storage.
export function usePersistReviewResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, after, log }: PersistReviewResultInput) => {
      // `log.reviewedAt`, not Date.now(): the graded card must be byte-identical
      // on every attempt, so retrying a failed commit re-sends the same result
      // instead of a slightly newer one.
      const graded = { ...card, scheduling: after, updatedAt: log.reviewedAt }
      await repo.commitReview({ card: graded, log })
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

// Reverse the most recent grade: restore the original card verbatim and remove
// its log. The exact inverse of the commit above, and atomic for the same
// reason — a half-undone review is its own inconsistency.
export function useUndoGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, logId }: UndoInput) => {
      await repo.revertReview({ card, logId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.reviewsAll })
    },
  })
}
