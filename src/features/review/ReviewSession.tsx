import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { Card, Rating } from '@/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { CardTypeBadge } from '@/features/cards/CardTypeBadge'
import { CardView } from '@/features/cards/CardView'
import { getCardDefinition } from '@/features/cards/registry'
import type { CardResponse } from '@/features/cards/registry/types'
import { GradeBar } from './GradeBar'
import { useReviewSession } from './useReviewSession'

export function ReviewSession({ cards }: { cards: Card[] }) {
  const session = useReviewSession(cards)
  const { current, revealed, isComplete, busy, canUndo } = session

  // Per-card interaction state for interactive types (MCQ, ordering…); reset on
  // each card. Self-graded types ignore it.
  const [response, setResponse] = useState<CardResponse>(undefined)
  useEffect(() => {
    setResponse(undefined)
  }, [current?.id])

  const def = current ? getCardDefinition(current.type) : undefined
  const interactive = def?.interactive ?? false
  const responseReady =
    !interactive || (def?.isResponseReady?.(response) ?? true)

  // For auto-graded types, evaluate on reveal. Correct -> suggest Good, else Again.
  const autoResult =
    revealed && current && def?.autoGrade
      ? def.autoGrade(current.content, response)
      : null
  const suggested: Rating | undefined = autoResult
    ? autoResult.correct
      ? 3
      : 1
    : undefined

  function grade(rating: Rating) {
    // autoGraded = the user accepted the auto-suggested rating (vs overriding).
    session.submitGrade(rating, suggested != null && rating === suggested)
  }

  // Keyboard: Space/Enter reveals (when a response is ready); 1–4 grade once
  // revealed; U undoes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isComplete) return
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) {
        if (!responseReady) return
        e.preventDefault()
        session.reveal()
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        grade(Number(e.key) as Rating)
      } else if (e.key.toLowerCase() === 'u' && canUndo) {
        e.preventDefault()
        session.undoLast()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, isComplete, canUndo, responseReady, suggested, session])

  if (isComplete) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-border bg-panel p-8 text-center">
        <div className="text-2xl font-bold tracking-tight">All done 🎉</div>
        <p className="mt-2 text-sm text-muted">
          Reviewed {session.total} card{session.total === 1 ? '' : 's'}.
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          {canUndo && (
            <Button onClick={() => session.undoLast()} disabled={busy}>
              <Undo2 size={15} /> Undo last
            </Button>
          )}
          <Link to="/">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!current) return null

  const progress = session.total
    ? (session.reviewedCount / session.total) * 100
    : 0

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-panel-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          Card {session.reviewedCount + 1} of {session.total}
        </span>
        <button
          type="button"
          onClick={() => session.undoLast()}
          disabled={!canUndo || busy}
          className="inline-flex items-center gap-1 hover:text-text disabled:opacity-40"
        >
          <Undo2 size={13} /> Undo
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow)]">
        <div className="mb-3.5 flex items-center gap-2">
          <CardTypeBadge type={current.type} />
          {current.tags.map((tag) => (
            <span key={tag} className="font-mono text-[11.5px] text-blue">
              #{tag}
            </span>
          ))}
        </div>

        <CardView
          card={current}
          revealed={revealed}
          response={response}
          setResponse={setResponse}
        />

        {!revealed ? (
          <Button
            variant="secondary"
            className="mt-5 w-full"
            disabled={!responseReady}
            onClick={() => session.reveal()}
          >
            {interactive ? 'Check answer' : 'Show answer'}
          </Button>
        ) : (
          <>
            {autoResult && (
              <div
                className={cn(
                  'mt-4 rounded-[9px] px-3.5 py-2.5 text-sm font-semibold',
                  autoResult.correct
                    ? 'bg-green/10 text-green'
                    : 'bg-red/10 text-red',
                )}
              >
                {autoResult.correct ? 'Correct' : 'Incorrect'}
                <span className="ml-1.5 font-normal text-muted">
                  · auto-graded — override below if needed
                </span>
              </div>
            )}
            <GradeBar
              card={current}
              disabled={busy}
              suggested={suggested}
              onGrade={grade}
            />
          </>
        )}
      </div>
    </div>
  )
}
