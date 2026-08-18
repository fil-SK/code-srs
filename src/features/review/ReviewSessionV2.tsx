import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { Card, ID } from '@/types'
import type { SubmitReviewResult } from '@/domain/scheduling/reviewService'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { usePersistReviewResult, useUndoGrade } from '@/hooks/useReview'

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
// `usePersistReviewResult`.
export function ReviewSessionV2({ cards }: { cards: Card[] }) {
  const navigate = useNavigate()
  const [queue] = useState(() => cards)
  const [index, setIndex] = useState(0)
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const persist = usePersistReviewResult()
  const undo = useUndoGrade()

  const current = queue[index]
  const isComplete = index >= queue.length
  const busy = persist.isPending || undo.isPending

  async function handleGraded(original: Card, result: SubmitReviewResult) {
    await persist.mutateAsync({ card: original, after: result.after, log: result.log })
    setUndoStack((s) => [...s, { card: original, logId: result.log.id }])
    setIndex((i) => i + 1)
  }

  async function undoLast() {
    const entry = undoStack[undoStack.length - 1]
    if (!entry || busy) return
    await undo.mutateAsync(entry)
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
      />
    </IteraSurface>
  )
}
