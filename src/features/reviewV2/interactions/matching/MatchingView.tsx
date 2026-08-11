import { useMemo } from 'react'
import { RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import { gradeMatching, type MatchingResponse } from '@/domain/grading/matching'
import { FlashcardSurface } from '../../components/FlashcardSurface'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'
import { MatchingAccordionBack, MatchingAccordionFront } from './MatchingAccordion'
import { MatchingBoard } from './MatchingBoard'

// Two shapes of Matching, one grading path. A plain two-column card renders as
// a connected board (MatchingBoard) — the mockup's layout, where each pair is
// drawn as a line between the two facing columns. A card with more than one
// value column keeps the accordion (MatchingAccordion), which is the only
// layout that stays readable for 3-part relationships. Everything else — the
// response shape, grading, submit gating — is identical for both.
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
  const [sourceCol, ...otherCols] = interaction.columns
  const assign = (response as MatchingResponse | undefined) ?? {}
  const flipped = phase.kind !== 'presenting'
  const locked = flipped || Boolean(hideActions)
  const grade = flipped ? gradeMatching(interaction, assign) : null
  const board = otherCols.length === 1 ? otherCols[0] : null

  // Presentation order for the board's right column, held here (not inside
  // MatchingBoard) because the front and back faces mount separate board
  // instances - shuffling inside one would deal a different layout on reveal
  // than the learner answered on. A fixed column's items are a shared option
  // list in authored order, which carries no answer information; a unique
  // column's are one per row in row order, so unshuffled would give it away.
  const targetItems = useMemo(
    () => (!board ? [] : board.fixed ? board.items : shuffle(board.items)),
    [board],
  )

  function setCell(sourceId: string, columnId: string, itemId: string) {
    if (locked) return
    const nextForSource = { ...(assign[sourceId] ?? {}) }
    if (nextForSource[columnId] === itemId) {
      delete nextForSource[columnId] // clicking the current choice again clears it
    } else {
      nextForSource[columnId] = itemId
    }
    setResponse({ ...assign, [sourceId]: nextForSource })
  }

  // Board-only: assigning a value that another term already claims moves it,
  // so the unique-column invariant (no value paired twice) still holds.
  function setPair(sourceId: string, targetItemId: string) {
    if (locked || !board) return
    const next: MatchingResponse = {}
    for (const [sid, cells] of Object.entries(assign)) {
      next[sid] =
        !board.fixed && sid !== sourceId && cells[board.id] === targetItemId
          ? Object.fromEntries(Object.entries(cells).filter(([cid]) => cid !== board.id))
          : cells
    }
    next[sourceId] = { ...(next[sourceId] ?? {}), [board.id]: targetItemId }
    setResponse(next)
  }

  function clearPair(sourceId: string) {
    if (locked || !board) return
    const cells = { ...(assign[sourceId] ?? {}) }
    delete cells[board.id]
    setResponse({ ...assign, [sourceId]: cells })
  }

  const header = (size: 'front' | 'back') => (
    <div className="flex flex-col items-center gap-1 text-center">
      <InteractionLabel type="matching" />
      <RichText
        text={card.prompt.value}
        className={cn(
          'mt-2 font-bold leading-snug text-itera-ink-brand',
          size === 'front' ? 'text-2xl' : 'text-xl',
        )}
      />
      {size === 'front' && !locked && (
        <p className="text-xs font-medium text-itera-muted">
          {board
            ? 'Tap a term, then tap the value it pairs with.'
            : 'Select an item, then choose its match.'}
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

            {board ? (
              <MatchingBoard
                sourceCol={sourceCol}
                targetCol={board}
                targetItems={targetItems}
                assign={assign}
                setPair={setPair}
                clearPair={clearPair}
                locked={locked}
                grade={null}
              />
            ) : (
              <MatchingAccordionFront
                sourceCol={sourceCol}
                otherCols={otherCols}
                assign={assign}
                setCell={setCell}
                locked={locked}
              />
            )}

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

            {board ? (
              <MatchingBoard
                sourceCol={sourceCol}
                targetCol={board}
                targetItems={targetItems}
                assign={assign}
                setPair={setPair}
                clearPair={clearPair}
                locked
                grade={grade}
              />
            ) : (
              <MatchingAccordionBack sourceCol={sourceCol} otherCols={otherCols} grade={grade} />
            )}

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
