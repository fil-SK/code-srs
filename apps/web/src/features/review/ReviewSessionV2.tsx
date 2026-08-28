import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { summarizeSession } from '@itera/core'
import type { Card, ID, ReviewLog } from '@/types'
import type { SubmitReviewResult } from '@/domain/scheduling/reviewService'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import {
  reviewWriteGuarantee,
  usePersistReviewResult,
  useReviewLogs,
  useUndoGrade,
} from '@/hooks/useReview'
import {
  describeReviewCommitFailure,
  describeReviewUndoFailure,
} from '@/domain/review/reviewPersistFailure'
import { SessionCompleteCard } from './SessionCompleteCard'

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
  // The logs this session wrote, kept in order so the completion summary can
  // describe the session itself rather than the whole of history. Undo pops
  // the last one, exactly as it pops the undo stack.
  const [sessionLogs, setSessionLogs] = useState<ReviewLog[]>([])
  const persist = usePersistReviewResult()
  const undo = useUndoGrade()
  const history = useReviewLogs()

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
    setSessionLogs((s) => [...s, result.log])
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
    setSessionLogs((s) => s.slice(0, -1))
    setIndex((i) => Math.max(0, i - 1))
  }

  // Frozen when the session ends so the copy and the next-due label stay put
  // while the learner reads them. Undo drops out of this branch and a later
  // completion takes a fresh reading, which is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const completedAt = useMemo(() => Date.now(), [isComplete])
  const summary = useMemo(
    () => summarizeSession(sessionLogs, history.data ?? [], completedAt),
    [sessionLogs, history.data, completedAt],
  )

  if (isComplete) {
    return (
      <IteraSurface className="grid min-h-screen place-items-center py-10">
        <SessionCompleteCard
          summary={summary}
          completedAt={completedAt}
          canUndo={undoStack.length > 0}
          busy={busy}
          undoError={undoError}
          onUndo={undoLast}
        />
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
