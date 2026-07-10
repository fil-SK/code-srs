import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import type { Roadmap } from '@/types'
import { newId } from '@/lib/id'
import { selectClass } from '@/components/ui/Field'
import { useDecks } from '@/hooks/useDecks'
import { useRoadmap, useSaveRoadmap } from '@/hooks/useRoadmaps'
import { RoadmapCanvas } from './RoadmapCanvas'

// Spread new nodes out on a rough grid so they don't stack on the same spot.
function spawnPosition(count: number) {
  const col = count % 4
  const row = Math.floor(count / 4)
  return { x: 60 + col * 240, y: 60 + row * 140 }
}

export function RoadmapEditorPage() {
  const { id } = useParams()
  const query = useRoadmap(id)
  const decks = useDecks()
  const save = useSaveRoadmap()

  // Local draft is the source of truth while editing; seed it once per roadmap
  // so a save's refetch never clobbers an in-flight change.
  const [draft, setDraft] = useState<Roadmap | null>(null)
  useEffect(() => {
    if (query.data && draft?.id !== query.data.id) setDraft(query.data)
  }, [query.data, draft?.id])

  function commit(next: Roadmap) {
    setDraft(next)
    save.mutate(next)
  }

  function renameRoadmap() {
    if (!draft) return
    const title = window.prompt('Roadmap title', draft.title)?.trim()
    if (title && title !== draft.title) commit({ ...draft, title })
  }

  function addNode(deckId: string) {
    if (!draft) return
    const { x, y } = spawnPosition(draft.nodes.length)
    commit({
      ...draft,
      nodes: [...draft.nodes, { id: newId(), deckId, x, y }],
    })
  }

  function removeNode(nodeId: string) {
    if (!draft) return
    commit({
      ...draft,
      nodes: draft.nodes.filter((n) => n.id !== nodeId),
      edges: draft.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    })
  }

  function moveNode(nodeId: string, x: number, y: number) {
    if (!draft) return
    commit({
      ...draft,
      nodes: draft.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    })
  }

  function addEdge(from: string, to: string) {
    if (!draft) return
    const exists = draft.edges.some((e) => e.from === from && e.to === to)
    if (exists) return
    commit({ ...draft, edges: [...draft.edges, { id: newId(), from, to }] })
  }

  function removeEdge(edgeId: string) {
    if (!draft) return
    commit({ ...draft, edges: draft.edges.filter((e) => e.id !== edgeId) })
  }

  if (query.isLoading || !draft) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  const available = (decks.data ?? []).filter(
    (d) => !draft.nodes.some((n) => n.deckId === d.id),
  )

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/roadmaps"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text"
      >
        <ArrowLeft size={15} /> Roadmaps
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={renameRoadmap}
          className="group inline-flex items-center gap-2 text-left"
        >
          <h1 className="text-xl font-bold tracking-tight">{draft.title}</h1>
          <Pencil size={15} className="text-faint group-hover:text-muted" />
        </button>

        <label className="flex items-center gap-2">
          <span className="sr-only">Add a deck</span>
          <div className="relative">
            <select
              className={`${selectClass} pl-8`}
              value=""
              onChange={(e) => {
                if (e.target.value) addNode(e.target.value)
              }}
              disabled={available.length === 0}
            >
              <option value="" disabled>
                {available.length === 0
                  ? 'All decks added'
                  : 'Add a deck to the roadmap…'}
              </option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Plus
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </label>
      </div>

      {(decks.data?.length ?? 0) === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-panel p-10 text-center text-sm text-muted">
          Create some decks first, then add them here to build a learning path.{' '}
          <Link to="/decks" className="text-accent hover:underline">
            Go to Decks
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">
            Drag a node to move it. Drag from a node's right-edge dot onto another
            node to link them (arrow points to what to study next). Click a link
            to delete it.
          </p>
          <RoadmapCanvas
            nodes={draft.nodes}
            edges={draft.edges}
            decks={decks.data ?? []}
            onMoveNode={moveNode}
            onAddEdge={addEdge}
            onRemoveEdge={removeEdge}
            onRemoveNode={removeNode}
          />
        </>
      )}
    </div>
  )
}
