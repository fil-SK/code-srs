import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { InlineText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import type { MatchingColumn, MatchingColumnItem } from '@/types/cardV2'
import type { MatchingGrade, MatchingResponse } from '@/domain/grading/matching'

// The N-column (3+) Matching body: select-a-source-then-select-a-value,
// generalized to any number of non-source columns. Clicking a source item
// expands it (one at a time, accordion-style) to reveal every other column's
// item list as chips, so a 3-part relationship is filled from one expanded row
// rather than needing a per-column step.
//
// This was the layout for every Matching card until the two-column connected
// board (MatchingBoard.tsx) landed. It stays as the 3+-column path because a
// board only reads as "connected" between two facing columns — three columns
// side by side would need lines from column 1 to column 3 crossing straight
// through column 2. Pairing state here is always shown as text (the row's
// summary line, or explicit "should be X" in feedback), never color/position
// alone.

interface AccordionProps {
  sourceCol: MatchingColumn
  otherCols: MatchingColumn[]
  assign: MatchingResponse
  setCell: (sourceId: string, columnId: string, itemId: string) => void
  locked: boolean
}

function labelOf(col: MatchingColumn): string {
  return col.label ?? col.id
}

export function MatchingAccordionFront({
  sourceCol,
  otherCols,
  assign,
  setCell,
  locked,
}: AccordionProps) {
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)

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
        return label ? `${labelOf(col)}: ${label}` : `${labelOf(col)}: not set`
      })
      .join(' · ')
  }

  return (
    <ul className="space-y-2">
      {sourceCol.items.map((sourceItem) => {
        const isActive = activeSourceId === sourceItem.id

        return (
          <li
            key={sourceItem.id}
            className="rounded-itera-control border border-itera-border bg-itera-surface"
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
              <span className="text-xs text-itera-muted">{summaryFor(sourceItem.id)}</span>
            </button>

            {isActive && (
              <div className="space-y-3 border-t border-dashed border-itera-border px-3.5 py-3">
                {otherCols.map((col) => (
                  <div key={col.id}>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-itera-muted">
                      {labelOf(col)}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
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
          </li>
        )
      })}
    </ul>
  )
}

export function MatchingAccordionBack({
  sourceCol,
  otherCols,
  grade,
}: {
  sourceCol: MatchingColumn
  otherCols: MatchingColumn[]
  grade: MatchingGrade | null
}) {
  function itemLabel(col: MatchingColumn | undefined, itemId: string | undefined): string | undefined {
    if (!col || !itemId) return undefined
    return col.items.find((i: MatchingColumnItem) => i.id === itemId)?.content.value
  }

  return (
    <ul className="space-y-2">
      {sourceCol.items.map((sourceItem) => {
        const rowCells = grade?.cells.filter((c) => c.sourceItemId === sourceItem.id) ?? []
        const rowCorrect = rowCells.length > 0 && rowCells.every((c) => c.correct)

        return (
          <li
            key={sourceItem.id}
            className={cn(
              'rounded-itera-control border border-l-4 bg-itera-surface',
              rowCorrect
                ? 'border-itera-border border-l-itera-success'
                : 'border-itera-border border-l-itera-error',
            )}
          >
            <div className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm">
              <span className="font-medium text-itera-ink">
                <InlineText text={sourceItem.content.value} />
              </span>
              <span className="text-xs text-itera-muted">
                {rowCorrect ? (
                  <span className="inline-flex items-center gap-1 text-itera-success">
                    <Check size={14} />
                    Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-itera-error">
                    <X size={14} />
                    Incorrect
                  </span>
                )}
              </span>
            </div>

            {rowCells.length > 0 && (
              <div className="space-y-1 border-t border-dashed border-itera-border px-3.5 py-3 text-xs">
                {rowCells.map((cell) => {
                  const col = otherCols.find((c) => c.id === cell.columnId)
                  const chosenLabel = itemLabel(col, cell.chosenItemId)
                  const correctLabel = itemLabel(col, cell.correctItemId)
                  return (
                    <div
                      key={cell.columnId}
                      className={cell.correct ? 'text-itera-success' : 'text-itera-error'}
                    >
                      {labelOf(col ?? { id: cell.columnId, items: [] })}:{' '}
                      <InlineText text={chosenLabel ?? '(none)'} />
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
  )
}
