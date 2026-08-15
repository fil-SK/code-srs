import { Fragment, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { InlineText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import type { MatchingColumn, MatchingColumnItem } from '@/types/cardV2'
import type { MatchingGrade, MatchingResponse } from '@/domain/grading/matching'
import { placeMatchingBadges, type CubicEdgeGeometry } from './matchingBadgeGeometry'

// The Matching board: terms in the first column, values in the columns facing
// it, and a drawn connector for every pair the learner has made (see the
// matching-card mockup). The connection itself — a line ending in a badge — is
// the primary state indicator, so pairing never depends on color alone: while
// answering, lines are neutral grey with a navy check badge meaning "paired"
// (not "correct"); after grading each line turns success/error with a check or
// X badge, and every wrong row additionally states its correct value in text.
//
// A relationship with more than two columns is drawn as a chain: term -> its
// value in column 2 -> its value in column 3, one hop per gutter. That is what
// a relationship row literally is (a tuple across the columns), and it keeps
// one visual language for every Matching card. The alternative — every column
// connecting back to the term — can't be drawn, since those lines would have
// to cross straight through the intervening column's cards. A hop whose
// preceding column is still unset simply starts from the term instead, so a
// half-filled row is still legible.
//
// Lines are real geometry, not a CSS trick: each column is presented shuffled
// (its authored order mirrors the relationship rows and would otherwise hand
// over the answer), so a pair is usually not two facing neighbours and the
// connector has to be measured. Positions come from offsetLeft/offsetTop
// rather than getBoundingClientRect because this renders inside FlipCard's
// rotated container, where client rects are foreshortened mid-flip while
// offsets stay in layout space.

export type BoardEdgeState = 'paired' | 'correct' | 'incorrect'

interface Anchor {
  x: number
  y: number
  w: number
  h: number
}

type Anchors = Record<string, Anchor>

interface Edge {
  key: string
  state: BoardEdgeState
  d: string // SVG path for the connector
  badgeX: number
  badgeY: number
}

// Where in the grid an item lives: column 0 is the term column.
interface Pick {
  columnIndex: number
  itemId: string
}

const EDGE_STROKE: Record<BoardEdgeState, string> = {
  paired: 'var(--itera-border-strong)',
  correct: 'var(--itera-success)',
  incorrect: 'var(--itera-error)',
}

const BADGE_CLASS: Record<BoardEdgeState, string> = {
  paired: 'bg-itera-navy',
  correct: 'bg-itera-success',
  incorrect: 'bg-itera-error',
}

// Fixed columns are a shared option list — usually short labels like Yes/No —
// so they get a narrower track than the free-text columns they sit beside.
const FIXED_COLUMN_TRACK = 'minmax(0,0.6fr)'
const COLUMN_TRACK = 'minmax(0,1fr)'
const GUTTER_TRACK = 'clamp(2.5rem,6vw,5rem)'

// RichText's inline syntax (`code`, **bold**, *italic*) is markup, not content:
// the visible label renders it, but an accessible name has to read the words
// rather than spelling out the markers.
function plainLabel(text: string): string {
  return text.replace(/[`*]/g, '')
}

function labelOf(col: MatchingColumn): string {
  return col.label ?? col.id
}

// Offset chain rather than a single offsetLeft read, so an intermediate
// positioned wrapper (now or later) can't silently shift every line.
function offsetWithin(el: HTMLElement, container: HTMLElement): { x: number; y: number } {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== container) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y }
}

function sameAnchors(a: Anchors, b: Anchors): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every((k) => {
    const p = a[k]
    const q = b[k]
    return q != null && p.x === q.x && p.y === q.y && p.w === q.w && p.h === q.h
  })
}

export function MatchingBoard({
  columns,
  presented,
  assign,
  setCell,
  locked,
  grade,
}: {
  columns: MatchingColumn[] // columns[0] is the term ("source") column
  // Presentation order per column id, owned by the caller so it survives the
  // flip: the two faces are separate positions in the React tree, so a board
  // that shuffled internally would re-shuffle on reveal and show the learner a
  // different layout than the one they answered on.
  presented: Record<string, MatchingColumnItem[]>
  assign: MatchingResponse
  // itemId null clears the cell. Stealing a value from another term (and the
  // resulting unique-column bookkeeping) is the caller's business.
  setCell: (sourceId: string, columnId: string, itemId: string | null) => void
  locked: boolean
  grade: MatchingGrade | null
}) {
  const [sourceCol, ...otherCols] = columns
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const [anchors, setAnchors] = useState<Anchors>({})
  // Either end can be picked first: a term then its value, or a value then its
  // term (or, in a chain, a value then the value that follows it).
  const [pending, setPending] = useState<Pick | null>(null)

  const registerItem = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) itemRefs.current.set(id, el)
      else itemRefs.current.delete(id)
    }
  }, [])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const next: Anchors = {}
    for (const [id, el] of itemRefs.current) {
      const { x, y } = offsetWithin(el, container)
      next[id] = { x, y, w: el.offsetWidth, h: el.offsetHeight }
    }
    setAnchors((prev) => (sameAnchors(prev, next) ? prev : next))
  }, [])

  // No dependency list: every render re-measures and bails out via sameAnchors
  // unless geometry actually moved, so wrapping text, a newly revealed row, or
  // a late font swap can't leave lines pointing at stale positions. The
  // ResizeObserver covers resizes that don't re-render.
  useLayoutEffect(measure)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [measure])

  const chosenIn = (sourceId: string, columnId: string): string | undefined =>
    assign[sourceId]?.[columnId]

  // Plural on purpose: a shared (fixed) column's value can serve any number of
  // terms at once, so "who is connected to this" is a list, not one answer.
  const ownersOf = (columnId: string, itemId: string): string[] =>
    Object.keys(assign).filter((sid) => assign[sid]?.[columnId] === itemId)

  const ownerOf = (columnId: string, itemId: string): string | undefined =>
    ownersOf(columnId, itemId)[0]

  const itemText = (col: MatchingColumn, id: string | undefined): string | undefined =>
    id ? col.items.find((i: MatchingColumnItem) => i.id === id)?.content.value : undefined

  const cellFor = (sourceId: string, columnId: string) =>
    grade?.cells.find((c) => c.sourceItemId === sourceId && c.columnId === columnId)

  // Which term a pick belongs to. A term is its own answer; a value belongs to
  // whoever claimed it. A fixed column's value is claimed by several terms at
  // once, so it can never anchor a new pairing on its own.
  function termBehind(pick: Pick): string | undefined {
    if (pick.columnIndex === 0) return pick.itemId
    const col = columns[pick.columnIndex]
    return col.fixed ? undefined : ownerOf(col.id, pick.itemId)
  }

  // One entry per drawn hop, already resolved to layout coordinates. Empty
  // until the first measurement lands (and permanently so in a
  // DOM-without-layout environment like the test suite's, where every offset
  // reads 0 and there is no geometry to draw).
  const rawEdges: Array<Omit<Edge, 'badgeX' | 'badgeY'> & { curve: CubicEdgeGeometry }> =
    sourceCol.items.flatMap((sourceItem) => {
      const rowEdges: Array<Omit<Edge, 'badgeX' | 'badgeY'> & { curve: CubicEdgeGeometry }> = []
      let anchorId = sourceItem.id
      for (const col of otherCols) {
        const chosenId = chosenIn(sourceItem.id, col.id)
        if (!chosenId) continue // hop skipped; the next one starts from the last known point
        const from = anchors[anchorId]
        const to = anchors[chosenId]
        anchorId = chosenId
        if (!from || !to || from.w === 0 || to.w === 0) continue
        const cell = cellFor(sourceItem.id, col.id)
        const x1 = from.x + from.w
        const y1 = from.y + from.h / 2
        const x2 = to.x
        const y2 = to.y + to.h / 2
        const bend = Math.max(12, (x2 - x1) * 0.4)
        const curve = {
          x1,
          y1,
          controlX1: x1 + bend,
          controlY1: y1,
          controlX2: x2 - bend,
          controlY2: y2,
          x2,
          y2,
        }
        rowEdges.push({
          key: `${sourceItem.id}:${col.id}`,
          state: !grade ? 'paired' : cell?.correct ? 'correct' : 'incorrect',
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          curve,
        })
      }
      return rowEdges
    })
  const badgeCenters = placeMatchingBadges(rawEdges.map((edge) => edge.curve))
  const edges: Edge[] = rawEdges.map(({ curve: _curve, ...edge }, index) => ({
    ...edge,
    badgeX: badgeCenters[index].x,
    badgeY: badgeCenters[index].y,
  }))

  function onItemClick(columnIndex: number, itemId: string) {
    if (locked) return

    if (pending && !(pending.columnIndex === columnIndex && pending.itemId === itemId)) {
      if (pending.columnIndex !== columnIndex) {
        // The later column is the one being filled in; the earlier one says
        // which term the value belongs to.
        const [anchor, target] =
          pending.columnIndex < columnIndex
            ? [pending, { columnIndex, itemId }]
            : [{ columnIndex, itemId }, pending]
        const termId = termBehind(anchor)
        const targetCol = columns[target.columnIndex]
        if (termId) {
          // Re-picking the value a term already points at unpairs it.
          const current = chosenIn(termId, targetCol.id)
          setCell(termId, targetCol.id, current === target.itemId ? null : target.itemId)
          setPending(null)
          return
        }
      }
      setPending({ columnIndex, itemId }) // unresolvable pair, or same column: just move the pick
      return
    }

    if (pending) {
      setPending(null) // picking the same item again cancels
      return
    }

    // Nothing picked yet. Tapping a connected value in the last column detaches
    // it — the only way to undo a pairing without first re-picking its term.
    // A connected value in a middle column means the opposite: it's the anchor
    // for the next hop of that chain, so it becomes the pending pick instead.
    // Shared columns are never a detach target either way, since a value there
    // can belong to several terms at once and there'd be no saying which one.
    const col = columns[columnIndex]
    const isLastColumn = columnIndex === columns.length - 1
    const owner = columnIndex === 0 || col.fixed || !isLastColumn
      ? undefined
      : ownerOf(col.id, itemId)
    if (owner) {
      setCell(owner, col.id, null)
      return
    }
    setPending({ columnIndex, itemId })
  }

  // Pairing state is stated in text, not left to the drawn line alone. With one
  // value column that reads as a plain pairing; with more, each column is named
  // so the whole relationship is legible.
  function termLabel(sourceItem: MatchingColumnItem): string {
    const term = plainLabel(sourceItem.content.value)
    if (otherCols.length === 1) {
      const chosen = itemText(otherCols[0], chosenIn(sourceItem.id, otherCols[0].id))
      return chosen ? `${term}, paired with ${plainLabel(chosen)}` : `${term}, not paired`
    }
    const parts = otherCols.map((col) => {
      const chosen = itemText(col, chosenIn(sourceItem.id, col.id))
      return `${labelOf(col)}: ${chosen ? plainLabel(chosen) : 'not set'}`
    })
    return `${term}, ${parts.join(', ')}`
  }

  function valueLabel(col: MatchingColumn, item: MatchingColumnItem): string {
    const value = plainLabel(item.content.value)
    const terms = ownersOf(col.id, item.id)
      .map((sid) => itemText(sourceCol, sid))
      .filter((text): text is string => Boolean(text))
      .map(plainLabel)
    return terms.length > 0 ? `${value}, paired with ${terms.join(', ')}` : `${value}, not paired`
  }

  const gridTemplateColumns = [
    COLUMN_TRACK,
    ...otherCols.flatMap((col) => [GUTTER_TRACK, col.fixed ? FIXED_COLUMN_TRACK : COLUMN_TRACK]),
  ].join(' ')

  const showColumnLabels = otherCols.length > 1 && columns.some((col) => col.label)

  const itemClass = (selected: boolean, state: BoardEdgeState | null) =>
    cn(
      'flex min-h-[3.5rem] w-full items-center rounded-itera-control border px-4 py-3 text-left text-sm text-itera-ink transition-colors',
      'bg-itera-selection-soft border-itera-border',
      !locked && 'hover:border-itera-selection-border',
      selected && 'border-itera-accent bg-itera-accent-soft',
      state === 'correct' && 'border-itera-success/40',
      state === 'incorrect' && 'border-itera-error/40',
      locked && 'cursor-default',
    )

  // min-h keeps every column's list starting at the same y even when one label
  // wraps to a second line, so rows stay aligned across the board.
  const columnHeader = (col: MatchingColumn) =>
    showColumnLabels ? (
      <div className="mb-2 min-h-8 text-xs font-semibold uppercase tracking-wide text-itera-muted">
        {col.label ?? ' '}
      </div>
    ) : null

  return (
    <div ref={containerRef} className="relative">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        {edges.map((edge) => (
          <path
            key={edge.key}
            d={edge.d}
            fill="none"
            strokeWidth={edge.state === 'paired' ? 1.5 : 2}
            stroke={EDGE_STROKE[edge.state]}
          />
        ))}
      </svg>

      <div className="relative grid items-start" style={{ gridTemplateColumns }}>
        <div>
          {columnHeader(sourceCol)}
          <ul className="flex flex-col gap-3">
            {sourceCol.items.map((sourceItem) => {
              const rowCells = grade?.cells.filter((c) => c.sourceItemId === sourceItem.id) ?? []
              const state: BoardEdgeState | null = !grade
                ? null
                : rowCells.length > 0 && rowCells.every((c) => c.correct)
                  ? 'correct'
                  : 'incorrect'
              const selected = pending?.columnIndex === 0 && pending.itemId === sourceItem.id

              return (
                <li key={sourceItem.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    ref={registerItem(sourceItem.id)}
                    disabled={locked}
                    aria-pressed={selected}
                    aria-label={termLabel(sourceItem)}
                    onClick={() => onItemClick(0, sourceItem.id)}
                    className={itemClass(selected, state)}
                  >
                    <span className="font-medium">
                      <InlineText text={sourceItem.content.value} />
                    </span>
                  </button>

                  {rowCells
                    .filter((cell) => !cell.correct)
                    .map((cell) => {
                      const col = otherCols.find((c) => c.id === cell.columnId)
                      if (!col) return null
                      return (
                        <p key={cell.columnId} className="px-1 text-xs text-itera-error">
                          {otherCols.length > 1 && `${labelOf(col)}: `}
                          {cell.chosenItemId ? 'Should be ' : 'Not answered — should be '}
                          <InlineText text={itemText(col, cell.correctItemId) ?? ''} />
                        </p>
                      )
                    })}
                </li>
              )
            })}
          </ul>
        </div>

        {otherCols.map((col, index) => (
          <Fragment key={col.id}>
            <div aria-hidden />
            <div>
              {columnHeader(col)}
              <ul className="flex flex-col gap-3">
                {(presented[col.id] ?? col.items).map((item) => {
                  const selected =
                    pending?.columnIndex === index + 1 && pending.itemId === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        ref={registerItem(item.id)}
                        disabled={locked}
                        aria-pressed={selected}
                        aria-label={valueLabel(col, item)}
                        onClick={() => onItemClick(index + 1, item.id)}
                        className={itemClass(selected, null)}
                      >
                        <InlineText text={item.content.value} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Fragment>
        ))}
      </div>

      {edges.map((edge) => (
        <span
          key={edge.key}
          aria-hidden
          style={{ left: edge.badgeX, top: edge.badgeY }}
          className={cn(
            'pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white',
            BADGE_CLASS[edge.state],
          )}
        >
          {edge.state === 'incorrect' ? (
            <X size={14} strokeWidth={3} />
          ) : (
            <Check size={14} strokeWidth={3} />
          )}
        </span>
      ))}
    </div>
  )
}
