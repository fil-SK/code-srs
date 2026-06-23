import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { Card } from '@/types'
import { Button } from '@/components/ui/Button'
import { CardTypeBadge } from '@/features/cards/CardTypeBadge'
import { GradeBar } from './GradeBar'
import { useReviewSession } from './useReviewSession'

// M2 renders Basic cards fully; other types get a minimal self-graded fallback
// until the card renderer registry lands in M3.
function CardFace({ card, revealed }: { card: Card; revealed: boolean }) {
  if (card.type === 'basic') {
    return (
      <>
        <div className="text-[17px] font-semibold leading-snug">
          {card.content.front}
        </div>
        {revealed && (
          <div className="mt-5 border-t border-dashed border-border pt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Answer
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {card.content.back}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="text-sm text-muted">
      This card type renders in M3. Reveal and self-grade still work.
    </div>
  )
}

export function ReviewSession({ cards }: { cards: Card[] }) {
  const session = useReviewSession(cards)
  const { current, revealed, isComplete, busy, canUndo } = session

  // Keyboard: Space/Enter reveals; 1–4 grade once revealed; U undoes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isComplete) return
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault()
        session.reveal()
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        session.submitGrade(Number(e.key) as 1 | 2 | 3 | 4)
      } else if (e.key.toLowerCase() === 'u' && canUndo) {
        e.preventDefault()
        session.undoLast()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, isComplete, canUndo, session])

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

        <CardFace card={current} revealed={revealed} />

        {!revealed ? (
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => session.reveal()}
          >
            Show answer
          </Button>
        ) : (
          <GradeBar
            card={current}
            disabled={busy}
            onGrade={(rating) => session.submitGrade(rating)}
          />
        )}
      </div>
    </div>
  )
}
