import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, SquarePen, X } from 'lucide-react'
import type { Deck, RoadmapEdge, RoadmapNode } from '@/types'
import { cn } from '@/lib/cn'

const NODE_W = 200
const NODE_H = 84
const BOARD_W = 1600
const BOARD_H = 1000

interface Point {
  x: number
  y: number
}

// The mutable, in-flight gesture. Kept in a ref so the window listeners always
// read the latest without re-subscribing.
type Interaction =
  | { kind: 'move'; id: string; dx: number; dy: number; x: number; y: number }
  | { kind: 'connect'; from: string }

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const center = (p: Point): Point => ({ x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 })

// The point on a node's border in the direction of (tx, ty); used to anchor
// edges to the box edges rather than burying them under the node.
function borderPoint(p: Point, tx: number, ty: number): Point {
  const cx = p.x + NODE_W / 2
  const cy = p.y + NODE_H / 2
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const s = Math.min(NODE_W / 2 / Math.abs(dx || 1e-6), NODE_H / 2 / Math.abs(dy || 1e-6))
  return { x: cx + dx * s, y: cy + dy * s }
}

export function RoadmapCanvas({
  nodes,
  edges,
  decks,
  onMoveNode,
  onAddEdge,
  onRemoveEdge,
  onRemoveNode,
}: {
  nodes: RoadmapNode[]
  edges: RoadmapEdge[]
  decks: Deck[]
  onMoveNode: (id: string, x: number, y: number) => void
  onAddEdge: (from: string, to: string) => void
  onRemoveEdge: (id: string) => void
  onRemoveNode: (id: string) => void
}) {
  const boardRef = useRef<HTMLDivElement>(null)
  const interaction = useRef<Interaction | null>(null)
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(
    null,
  )
  const [pending, setPending] = useState<{ from: string } & Point | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)

  function boardPoint(clientX: number, clientY: number): Point {
    const rect = boardRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const act = interaction.current
      if (!act) return
      const p = boardPoint(e.clientX, e.clientY)
      if (act.kind === 'move') {
        act.x = clamp(p.x - act.dx, 0, BOARD_W - NODE_W)
        act.y = clamp(p.y - act.dy, 0, BOARD_H - NODE_H)
        setDragPos({ id: act.id, x: act.x, y: act.y })
      } else {
        setPending({ from: act.from, x: p.x, y: p.y })
      }
    }
    function onUp(e: PointerEvent) {
      const act = interaction.current
      if (!act) return
      if (act.kind === 'move') {
        onMoveNode(act.id, act.x, act.y)
        setDragPos(null)
      } else {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
        const targetId = el?.closest('[data-node-id]')?.getAttribute('data-node-id')
        if (targetId && targetId !== act.from) onAddEdge(act.from, targetId)
        setPending(null)
      }
      interaction.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [onMoveNode, onAddEdge])

  const posOf = (nodeId: string): Point | undefined => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return undefined
    if (dragPos?.id === nodeId) return { x: dragPos.x, y: dragPos.y }
    return { x: node.x, y: node.y }
  }

  function startMove(e: React.PointerEvent, node: RoadmapNode) {
    if (e.button !== 0) return
    e.preventDefault()
    const p = boardPoint(e.clientX, e.clientY)
    interaction.current = {
      kind: 'move',
      id: node.id,
      dx: p.x - node.x,
      dy: p.y - node.y,
      x: node.x,
      y: node.y,
    }
    setDragPos({ id: node.id, x: node.x, y: node.y })
    setSelectedEdge(null)
  }

  function startConnect(e: React.PointerEvent, node: RoadmapNode) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const p = boardPoint(e.clientX, e.clientY)
    interaction.current = { kind: 'connect', from: node.id }
    setPending({ from: node.id, x: p.x, y: p.y })
  }

  const stop = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      className="overflow-auto rounded-card border border-border bg-panel"
      style={{ height: 560 }}
    >
      <div
        ref={boardRef}
        className="relative select-none"
        style={{
          width: BOARD_W,
          height: BOARD_H,
          touchAction: 'none',
          backgroundImage:
            'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onPointerDown={() => setSelectedEdge(null)}
      >
        <svg className="absolute inset-0" width={BOARD_W} height={BOARD_H}>
          <defs>
            <marker
              id="rm-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--color-muted)" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const s = posOf(edge.from)
            const t = posOf(edge.to)
            if (!s || !t) return null
            const sc = center(s)
            const tc = center(t)
            const a = borderPoint(s, tc.x, tc.y)
            const b = borderPoint(t, sc.x, sc.y)
            const isSel = selectedEdge === edge.id
            return (
              <g key={edge.id}>
                {/* fat invisible hit target for easy selection */}
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setSelectedEdge(edge.id)
                  }}
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={isSel ? 3 : 2}
                  markerEnd="url(#rm-arrow)"
                  style={{ stroke: isSel ? 'var(--color-red)' : 'var(--color-muted)' }}
                />
              </g>
            )
          })}

          {pending &&
            (() => {
              const s = posOf(pending.from)
              if (!s) return null
              const a = borderPoint(s, pending.x, pending.y)
              return (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={pending.x}
                  y2={pending.y}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  style={{ stroke: 'var(--color-accent)' }}
                />
              )
            })()}
        </svg>

        {nodes.map((node) => {
          const pos = posOf(node.id)!
          const deck = decks.find((d) => d.id === node.deckId)
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              className="absolute rounded-[10px] border border-border bg-panel-2 shadow-[var(--shadow)]"
              style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
              onPointerDown={(e) => startMove(e, node)}
            >
              <div className="flex h-full cursor-grab flex-col p-2.5 active:cursor-grabbing">
                <div className="flex items-start justify-between gap-1">
                  <div
                    className={cn(
                      'min-w-0 truncate text-sm font-semibold',
                      !deck && 'text-red',
                    )}
                  >
                    {deck ? deck.name : '(deleted deck)'}
                  </div>
                  <button
                    type="button"
                    onPointerDown={stop}
                    onClick={() => onRemoveNode(node.id)}
                    className="rounded p-0.5 text-muted hover:text-red"
                    aria-label="Remove node"
                  >
                    <X size={14} />
                  </button>
                </div>
                {deck && (
                  <div className="mt-auto flex gap-1.5">
                    <Link
                      to={`/decks/${deck.id}`}
                      onPointerDown={stop}
                      className="inline-flex items-center gap-1 rounded-[7px] border border-border px-2 py-1 text-[11px] font-semibold text-muted hover:border-accent hover:text-text"
                    >
                      <SquarePen size={12} /> Open
                    </Link>
                    <Link
                      to={`/review?deck=${deck.id}`}
                      onPointerDown={stop}
                      className="inline-flex items-center gap-1 rounded-[7px] bg-accent px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                    >
                      <Play size={12} /> Study
                    </Link>
                  </div>
                )}
              </div>
              {/* drag-to-connect handle */}
              <button
                type="button"
                onPointerDown={(e) => startConnect(e, node)}
                className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-panel bg-accent hover:scale-125"
                aria-label="Drag to connect to another deck"
                title="Drag to another deck to link them"
              />
            </div>
          )
        })}

        {selectedEdge &&
          (() => {
            const edge = edges.find((e) => e.id === selectedEdge)
            if (!edge) return null
            const s = posOf(edge.from)
            const t = posOf(edge.to)
            if (!s || !t) return null
            const a = borderPoint(s, center(t).x, center(t).y)
            const b = borderPoint(t, center(s).x, center(s).y)
            return (
              <button
                type="button"
                onPointerDown={stop}
                onClick={() => {
                  onRemoveEdge(edge.id)
                  setSelectedEdge(null)
                }}
                className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-red text-white shadow-[var(--shadow)] hover:brightness-110"
                style={{ left: (a.x + b.x) / 2 - 12, top: (a.y + b.y) / 2 - 12 }}
                aria-label="Delete link"
              >
                <X size={13} />
              </button>
            )
          })()}
      </div>
    </div>
  )
}
