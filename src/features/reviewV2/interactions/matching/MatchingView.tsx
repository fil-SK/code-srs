import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { gradeMatching, type MatchingResponse } from '@/domain/grading/matching'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'

// select-a-source-then-select-a-value, generalized to any number of non-source
// columns: clicking a source item expands it (one at a time, accordion-style)
// to reveal every other column's item list as chips, so a 3-part relationship
// is filled from one expanded row rather than needing a per-column step.
// Pairing state is always shown as text (the row's summary line, or explicit
// "should be X" in feedback) - never color/position alone.
export function MatchingView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
}: InteractionViewProps<'matching'>) {
  const { interaction } = card
  const [sourceCol, ...otherCols] = interaction.columns
  const assign = (response as MatchingResponse | undefined) ?? {}
  const locked = phase.kind !== 'presenting'
  const showFeedback =
    phase.kind === 'feedback' || phase.kind === 'rating' || phase.kind === 'transitioning'
  const grade = showFeedback ? gradeMatching(interaction, assign) : null

  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)

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

  // Non-fixed columns are unique-matching: an item claimed by another row is
  // unavailable here until that row's choice is cleared. Fixed columns share
  // one value list across every row, so nothing is ever "taken".
  function isTaken(columnId: string, fixed: boolean | undefined, itemId: string, ownerId: string) {
    if (fixed) return false
    return Object.entries(assign).some(
      ([sid, cells]) => sid !== ownerId && cells[columnId] === itemId,
    )
  }

  function summaryFor(sourceId: string): string {
    return otherCols
      .map((col) => {
        const chosenId = assign[sourceId]?.[col.id]
        const label = chosenId ? col.items.find((i) => i.id === chosenId)?.content.value : null
        return label ? `${col.label ?? col.id}: ${label}` : `${col.label ?? col.id}: not set`
      })
      .join(' · ')
  }

  return (
    <div>
      <InteractionLabel text="Matching" />
      <RichText
        text={card.prompt.value}
        className="mt-3 text-lg font-semibold leading-snug text-itera-ink-brand"
      />
      {!locked && (
        <p className="mt-1 text-xs font-medium text-itera-muted">
          Select an item, then choose its match.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {sourceCol.items.map((sourceItem) => {
          const isActive = !locked && activeSourceId === sourceItem.id
          const rowCells = grade?.cells.filter((c) => c.sourceItemId === sourceItem.id) ?? []
          const rowCorrect = rowCells.length > 0 && rowCells.every((c) => c.correct)

          return (
            <li
              key={sourceItem.id}
              className={cn(
                'rounded-itera-control border bg-itera-surface',
                showFeedback
                  ? cn(
                      'border-itera-border border-l-4',
                      rowCorrect ? 'border-l-itera-success' : 'border-l-itera-error',
                    )
                  : 'border-itera-border',
              )}
            >
              <button
                type="button"
                disabled={locked}
                aria-expanded={isActive}
                onClick={() => setActiveSourceId(isActive ? null : sourceItem.id)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm disabled:cursor-default"
              >
                <span className="font-medium text-itera-ink">
                  <InlineText text={sourceItem.content.value} />
                </span>
                <span className="text-xs text-itera-muted">
                  {showFeedback ? (
                    rowCorrect ? (
                      <span className="inline-flex items-center gap-1 text-itera-success">
                        <Check size={14} />
                        Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-itera-error">
                        <X size={14} />
                        Incorrect
                      </span>
                    )
                  ) : (
                    summaryFor(sourceItem.id)
                  )}
                </span>
              </button>

              {isActive && (
                <div className="space-y-3 border-t border-dashed border-itera-border px-3.5 py-3">
                  {otherCols.map((col) => (
                    <div key={col.id}>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-itera-muted">
                        {col.label ?? col.id}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {col.items.map((item) => {
                          const selected = assign[sourceItem.id]?.[col.id] === item.id
                          const taken = isTaken(col.id, col.fixed, item.id, sourceItem.id)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={selected}
                              disabled={taken}
                              onClick={() => setCell(sourceItem.id, col.id, item.id)}
                              className={cn(
                                'rounded-itera-pill border px-2.5 py-1 text-xs font-medium',
                                selected
                                  ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                                  : 'border-itera-border bg-itera-surface text-itera-ink hover:border-itera-border-strong',
                                taken && 'pointer-events-none opacity-30',
                              )}
                            >
                              <InlineText text={item.content.value} />
                              {taken && ' (used)'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showFeedback && rowCells.length > 0 && (
                <div className="space-y-1 border-t border-dashed border-itera-border px-3.5 py-3 text-xs">
                  {rowCells.map((cell) => {
                    const col = otherCols.find((c) => c.id === cell.columnId)
                    const chosenLabel = cell.chosenItemId
                      ? col?.items.find((i) => i.id === cell.chosenItemId)?.content.value
                      : undefined
                    const correctLabel = col?.items.find((i) => i.id === cell.correctItemId)
                      ?.content.value
                    return (
                      <div
                        key={cell.columnId}
                        className={cell.correct ? 'text-itera-success' : 'text-itera-error'}
                      >
                        {col?.label ?? col?.id}: <InlineText text={chosenLabel ?? '(none)'} />
                        {!cell.correct && (
                          <>
                            {' '}
                            — should be <InlineText text={correctLabel ?? ''} />
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {phase.kind === 'presenting' && (
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={!responseReady}
          className="mt-4 rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
        >
          Submit answer
        </button>
      )}

      {grade && (
        <div
          className={cn(
            'mt-4 rounded-itera-control px-3.5 py-2.5 text-sm font-semibold',
            grade.correct
              ? 'bg-itera-success-soft text-itera-success'
              : 'bg-itera-error-soft text-itera-error',
          )}
        >
          {grade.correct ? 'Correct' : `${Math.round(grade.score * 100)}% of relationships correct`}
        </div>
      )}
    </div>
  )
}
