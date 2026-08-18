import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import type { MatchingColumnItem } from '@/types/card'
import { gradeMatching, type MatchingResponse } from '@/domain/grading/matching'
import { CardPrompt } from '../../components/CardPrompt'
import { FlashcardSurface } from '../../components/FlashcardSurface'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'
import { MatchingBoard } from './MatchingBoard'

export function MatchingView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
  hideActions,
}: InteractionViewProps<'matching'>) {
  const { interaction } = card
  const { columns } = interaction
  const otherCols = columns.slice(1)
  const assign = (response as MatchingResponse | undefined) ?? {}
  const flipped = phase.kind !== 'presenting'
  const locked = flipped || Boolean(hideActions)
  const grade = flipped ? gradeMatching(interaction, assign) : null

  // Presentation order per value column, held here (not inside MatchingBoard)
  // because the front and back faces mount separate board instances -
  // shuffling inside one would deal a different layout on reveal than the
  // learner answered on. A fixed column's items are a shared option list in
  // authored order, which carries no answer information; a unique column's are
  // one per row in row order, so unshuffled would give it away.
  const presented = useMemo(() => {
    const byColumn: Record<string, MatchingColumnItem[]> = {}
    for (const col of otherCols) {
      byColumn[col.id] = col.fixed ? col.items : shuffle(col.items)
    }
    return byColumn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns])

  // Filling a cell in a unique column takes the value from whichever term
  // currently holds it, so "one value, one term" still holds there. A fixed
  // column is a shared list by definition: any number of terms may land on the
  // same value, and nothing is taken from anyone.
  function setCell(sourceId: string, columnId: string, itemId: string | null) {
    if (locked) return
    const column = otherCols.find((c) => c.id === columnId)
    const next: MatchingResponse = {}
    for (const [sid, cells] of Object.entries(assign)) {
      const steals = itemId != null && !column?.fixed && sid !== sourceId && cells[columnId] === itemId
      next[sid] = steals
        ? Object.fromEntries(Object.entries(cells).filter(([cid]) => cid !== columnId))
        : cells
    }
    const own = { ...(next[sourceId] ?? {}) }
    if (itemId == null) delete own[columnId]
    else own[columnId] = itemId
    next[sourceId] = own
    setResponse(next)
  }

  const header = (size: 'front' | 'back') => (
    <div className="flex flex-col items-center gap-1 text-center">
      <InteractionLabel type="matching" />
      <CardPrompt text={card.prompt.value} face={size} className="mt-2" />
      {size === 'front' && !locked && (
        <p className="text-xs font-medium text-itera-muted">
          Tap a term, then tap the value it pairs with.
        </p>
      )}
    </div>
  )

  return (
    <FlashcardSurface
      flipped={flipped}
      onFlip={onPrimaryAction}
      ariaLabel={
        flipped
          ? 'Matching card, results showing'
          : 'Matching card, match every item and submit to flip'
      }
      front={
        flipped ? null : (
          <div className="flex flex-col gap-6">
            {header('front')}

            <MatchingBoard
              columns={columns}
              presented={presented}
              assign={assign}
              setCell={setCell}
              locked={locked}
              grade={null}
            />

            {!hideActions && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  disabled={!responseReady}
                  className="rounded-itera-control bg-itera-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
                >
                  Submit answer
                </button>
              </div>
            )}
          </div>
        )
      }
      back={
        !flipped ? null : (
          <div className="flex flex-col gap-6">
            {header('back')}

            <MatchingBoard
              columns={columns}
              presented={presented}
              assign={assign}
              setCell={setCell}
              locked
              grade={grade}
            />

            {grade && (
              <div
                className={cn(
                  'rounded-itera-control px-3.5 py-2.5 text-center text-sm font-semibold',
                  grade.correct
                    ? 'bg-itera-success-soft text-itera-success'
                    : 'bg-itera-error-soft text-itera-error',
                )}
              >
                {grade.correct
                  ? 'Correct'
                  : `${Math.round(grade.score * 100)}% of relationships correct`}
              </div>
            )}
          </div>
        )
      }
    />
  )
}
