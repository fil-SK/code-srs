import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { Card, ID } from '@/types'
import type { SubmitReviewResult } from '@/domain/scheduling/reviewService'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import {
  reviewWriteGuarantee,
  usePersistReviewResult,
  useUndoGrade,
} from '@/hooks/useReview'
import {
  describeReviewCommitFailure,
  describeReviewUndoFailure,
} from '@/domain/review/reviewPersistFailure'

interface UndoEntry {
  card: Card // the pre-grade card, restored verbatim on undo
  logId: ID
}

// Production's Review surface. Cards render through the same shared shell
// used by /design-preview/* - there is no separate "production" copy of
// ReviewSessionScreen, the phase reducer, or the interaction registry.
//
// `schedulingBefore` is the real, current value from the snapshot queue, and
// grading persists back onto the card's own embedded scheduling via
// `usePersistReviewResult` - one atomic write of the graded card and its log
// together. This component owns the queue position and the undo stack, so it
// only advances either once that write has actually committed.
export function ReviewSessionV2({ cards }: { cards: Card[] }) {
  const navigate = useNavigate()
  const [queue] = useState(() => cards)
  const [index, setIndex] = useState(0)
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const [undoError, setUndoError] = useState<string | null>(null)
  const persist = usePersistReviewResult()
  const undo = useUndoGrade()

  const current = queue[index]
  const isComplete = index >= queue.length
  const busy = persist.isPending || undo.isPending

  // Rejects on purpose. ReviewSessionScreen awaits this and shows its own retry
  // state on a rejection, so swallowing the error here would put the session
  // back in the stuck-and-silent behaviour this replaced. Nothing below the
  // await runs on failure, so a failed write can neither advance the queue nor
  // push an undo entry for a review that was never recorded.
  async function handleGraded(original: Card, result: SubmitReviewResult) {
    if (busy) return
    await persist.mutateAsync({ card: original, after: result.after, log: result.log })
    setUndoStack((s) => [...s, { card: original, logId: result.log.id }])
    setIndex((i) => i + 1)
  }

  async function undoLast() {
    const entry = undoStack[undoStack.length - 1]
    if (!entry || busy) return
    setUndoError(null)
    try {
      await undo.mutateAsync(entry)
    } catch {
      // revertReview is atomic, so the grade is still fully recorded. Leaving
      // the stack and the index alone keeps the UI matching what is stored.
      setUndoError(describeReviewUndoFailure(reviewWriteGuarantee()))
      return
    }
    setUndoStack((s) => s.slice(0, -1))
    setIndex((i) => Math.max(0, i - 1))
  }

  if (isComplete) {
    return (
      <IteraSurface>
        <div className="mx-auto max-w-md rounded-itera-card border border-itera-border bg-itera-surface p-8 text-center shadow-[var(--itera-shadow-card)]">
          <div className="text-2xl font-bold tracking-tight text-itera-ink-brand">All done</div>
          <p className="mt-2 text-sm text-itera-muted">
            Reviewed {queue.length} card{queue.length === 1 ? '' : 's'}.
          </p>
          {undoError && (
            <p role="alert" className="mt-3 text-sm leading-relaxed text-itera-error">
              {undoError}
            </p>
          )}
          <div className="mt-5 flex justify-center gap-2.5">
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={undoLast}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-itera-control border border-itera-border bg-itera-surface px-4 py-2.5 text-sm font-semibold text-itera-ink transition-colors hover:border-itera-border-strong disabled:pointer-events-none disabled:opacity-40"
              >
                <Undo2 size={15} /> Undo last
              </button>
            )}
            <Link
              to="/"
              className="rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105"
            >
              Back to Today
            </Link>
          </div>
        </div>
      </IteraSurface>
    )
  }

  if (!current) return null

  return (
    <IteraSurface>
      <ReviewSessionScreen
        key={current.id}
        card={current}
        definition={getInteractionDefinition(current.interaction.type)}
        current={index + 1}
        total={queue.length}
        onExit={() => navigate('/')}
        schedulingBefore={current.scheduling}
        onGraded={(result) => handleGraded(current, result)}
        persistErrorMessage={describeReviewCommitFailure(reviewWriteGuarantee())}
      />
    </IteraSurface>
  )
}
