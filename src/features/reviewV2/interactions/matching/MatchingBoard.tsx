import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { InlineText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import type { MatchingColumn, MatchingColumnItem } from '@/types/cardV2'
import type { MatchingGrade, MatchingResponse } from '@/domain/grading/matching'

// The two-column Matching body: terms on the left, values on the right, and a
// drawn connector between every pair the learner has made (see
// docs/itera-claude-master-spec.md and the matching-card mockup). The
// connection itself — a line ending in a badge — is the primary state
// indicator, so pairing never depends on color alone: while answering, lines
// are neutral grey with a navy check badge meaning "paired" (not "correct");
// after grading, each line turns success/error with a check or X badge, and
// every wrong row additionally states its correct value in text.
//
// Lines are real geometry, not a CSS trick: the right column is presented
// shuffled (its authored order mirrors the row order and would otherwise hand
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

// How far along a connector its badge sits. Not the midpoint (the mockup's
// position, which only works when every line runs straight across): with a
// shuffled right column several lines cross, and their midpoints collapse onto
// the same point in the gutter, stacking the badges on top of each other.
// Anchoring near the term end instead gives every row exactly one badge at its
// own height, which is also where "Should be ..." is stated after grading.
const BADGE_T = 0.3

// RichText's inline syntax (`code`, **bold**, *italic*) is markup, not content:
// the visible label renders it, but an accessible name has to read the words
// rather than spelling out the markers.
function plainLabel(text: string): string {
  return text.replace(/[`*]/g, '')
}

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

export function MatchingBoard({
  sourceCol,
  targetCol,
  targetItems,
  assign,
  setPair,
  clearPair,
  locked,
  grade,
}: {
  sourceCol: MatchingColumn
  targetCol: MatchingColumn
  // Presentation order of the right column, owned by the caller so it survives
  // the flip: the two faces are separate positions in the React tree, so a
  // board that shuffled internally would re-shuffle on reveal and show the
  // learner a different layout than the one they answered on.
  targetItems: MatchingColumnItem[]
  assign: MatchingResponse
  setPair: (sourceId: string, targetItemId: string) => void
  clearPair: (sourceId: string) => void
  locked: boolean
  grade: MatchingGrade | null
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const [anchors, setAnchors] = useState<Anchors>({})
  // Either side can be picked first: pick a term then its value, or a value
  // then its term. Whichever is picked first is `pending`.
  const [pending, setPending] = useState<{ side: 'source' | 'target'; id: string } | null>(null)

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

  // No dependency list: every render re-measures and bails out via
  // sameAnchors unless geometry actually moved, so wrapping text, a newly
  // revealed row, or a late font swap can't leave lines pointing at stale
  // positions. The ResizeObserver covers resizes that don't re-render.
  useLayoutEffect(measure)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [measure])

  const chosenIdFor = (sourceId: string): string | undefined => assign[sourceId]?.[targetCol.id]
  const ownerOf = (targetItemId: string): string | undefined =>
    Object.keys(assign).find((sid) => assign[sid]?.[targetCol.id] === targetItemId)

  const itemText = (col: MatchingColumn, id: string | undefined): string | undefined =>
    id ? col.items.find((i: MatchingColumnItem) => i.id === id)?.content.value : undefined

  const cellFor = (sourceId: string) =>
    grade?.cells.find((c) => c.sourceItemId === sourceId && c.columnId === targetCol.id)

  // One entry per drawn connector, already resolved to layout coordinates.
  // Empty until the first measurement lands (and permanently so in a
  // DOM-without-layout environment like the test suite's), where every offset
  // reads 0 and there is no geometry to draw.
  const edges: Edge[] = sourceCol.items.flatMap((sourceItem) => {
    const targetId = chosenIdFor(sourceItem.id)
    const from = anchors[sourceItem.id]
    const to = targetId ? anchors[targetId] : undefined
    if (!targetId || !from || !to || from.w === 0 || to.w === 0) return []
    const cell = cellFor(sourceItem.id)
    const x1 = from.x + from.w
    const y1 = from.y + from.h / 2
    const x2 = to.x
    const y2 = to.y + to.h / 2
    const bend = Math.max(12, (x2 - x1) * 0.4)
    return [
      {
        key: `${sourceItem.id}:${targetId}`,
        state: !grade ? 'paired' : cell?.correct ? 'correct' : 'incorrect',
        d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
        badgeX: cubicAt(BADGE_T, x1, x1 + bend, x2 - bend, x2),
        badgeY: cubicAt(BADGE_T, y1, y1, y2, y2),
      },
    ]
  })

  function onSourceClick(sourceId: string) {
    if (locked) return
    if (pending?.side === 'target') {
      setPair(sourceId, pending.id)
      setPending(null)
      return
    }
    setPending(pending?.id === sourceId ? null : { side: 'source', id: sourceId })
  }

  function onTargetClick(targetItemId: string) {
    if (locked) return
    if (pending?.side === 'source') {
      // Re-picking the value a term already points at unpairs it. Picking one
      // that belongs to another term moves the connection here (allowed only
      // on the board, where the existing connection is visible - the accordion
      // marks claimed values unavailable instead, since there you can't see
      // what you'd be taking).
      if (chosenIdFor(pending.id) === targetItemId) clearPair(pending.id)
      else setPair(pending.id, targetItemId)
      setPending(null)
      return
    }
    if (pending?.side === 'target' && pending.id === targetItemId) {
      setPending(null)
      return
    }
    // Nothing picked yet: tapping a connected value detaches it, which is the
    // only affordance for undoing a pair without first re-picking its term.
    const owner = targetCol.fixed ? undefined : ownerOf(targetItemId)
    if (owner) {
      clearPair(owner)
      return
    }
    setPending({ side: 'target', id: targetItemId })
  }

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

      <div className="relative grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-start sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]">
        <ul className="flex flex-col gap-3">
          {sourceCol.items.map((sourceItem) => {
            const chosenId = chosenIdFor(sourceItem.id)
            const chosenText = itemText(targetCol, chosenId)
            const cell = cellFor(sourceItem.id)
            const state: BoardEdgeState | null = !grade
              ? null
              : cell?.correct
                ? 'correct'
                : 'incorrect'
            const correctText = itemText(targetCol, cell?.correctItemId)
            const selected = pending?.side === 'source' && pending.id === sourceItem.id

            return (
              <li key={sourceItem.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  ref={registerItem(sourceItem.id)}
                  disabled={locked}
                  aria-pressed={selected}
                  aria-label={
                    chosenText
                      ? `${plainLabel(sourceItem.content.value)}, paired with ${plainLabel(chosenText)}`
                      : `${plainLabel(sourceItem.content.value)}, not paired`
                  }
                  onClick={() => onSourceClick(sourceItem.id)}
                  className={itemClass(selected, state)}
                >
                  <span className="font-medium">
                    <InlineText text={sourceItem.content.value} />
                  </span>
                </button>

                {state === 'incorrect' && (
                  <p className="px-1 text-xs text-itera-error">
                    {chosenText ? 'Should be ' : 'Not answered — should be '}
                    <InlineText text={correctText ?? ''} />
                  </p>
                )}
              </li>
            )
          })}
        </ul>

        <div aria-hidden />

        <ul className="flex flex-col gap-3">
          {targetItems.map((item) => {
            const owner = targetCol.fixed ? undefined : ownerOf(item.id)
            const ownerText = itemText(sourceCol, owner)
            const selected = pending?.side === 'target' && pending.id === item.id

            return (
              <li key={item.id}>
                <button
                  type="button"
                  ref={registerItem(item.id)}
                  disabled={locked}
                  aria-pressed={selected}
                  aria-label={
                    ownerText
                      ? `${plainLabel(item.content.value)}, paired with ${plainLabel(ownerText)}`
                      : `${plainLabel(item.content.value)}, not paired`
                  }
                  onClick={() => onTargetClick(item.id)}
                  className={itemClass(selected, null)}
                >
                  <InlineText text={item.content.value} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {edges.map((edge) => {
        return (
          <span
            key={edge.key}
            aria-hidden
            style={{ left: edge.badgeX, top: edge.badgeY }}
            className={cn(
              'pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white',
              BADGE_CLASS[edge.state],
            )}
          >
            {edge.state === 'incorrect' ? <X size={14} strokeWidth={3} /> : <Check size={14} strokeWidth={3} />}
          </span>
        )
      })}
    </div>
  )
}
