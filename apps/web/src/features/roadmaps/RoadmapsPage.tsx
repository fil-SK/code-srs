import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Waypoints } from 'lucide-react'
import type { Roadmap } from '@/types'
import { Button } from '@/components/ui/Button'
import { useDialogs } from '@/components/ui/dialogs'
import {
  useCreateRoadmap,
  useDeleteRoadmap,
  useRoadmaps,
} from '@/hooks/useRoadmaps'

export function RoadmapsPage() {
  const roadmaps = useRoadmaps()
  const create = useCreateRoadmap()
  const remove = useDeleteRoadmap()
  const navigate = useNavigate()
  const dialogs = useDialogs()

  async function newRoadmap() {
    const title = await dialogs.prompt({
      title: 'New roadmap',
      label: 'Title',
      placeholder: 'e.g. C++ or MLIR',
      confirmLabel: 'Create',
    })
    if (!title) return
    create.mutate(
      { title },
      { onSuccess: (r) => navigate(`/roadmaps/${r.id}`) },
    )
  }

  async function deleteRoadmap(r: Roadmap) {
    const ok = await dialogs.confirm({
      title: `Delete “${r.title}”?`,
      description: 'The decks it arranges are not affected.',
      confirmLabel: 'Delete roadmap',
      danger: true,
    })
    if (ok) remove.mutate(r.id)
  }

  const list = roadmaps.data ?? []

  return (
    <div className="mx-auto max-w-3xl">
      {/* AppShell has no topbar title slot, so a page that needs a heading
          renders its own as ordinary content (same as Progress/Settings). */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-itera-display text-3xl font-bold text-itera-ink-brand">
            Roadmaps
          </h1>
          <p className="mt-1 text-sm text-muted">
            A roadmap arranges decks into a study order. Decks stay standalone; a
            roadmap is just a graph on top of them.
          </p>
        </div>
        <Button variant="primary" onClick={newRoadmap} className="shrink-0">
          <Plus size={15} /> New roadmap
        </Button>
      </div>

      {roadmaps.isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-panel p-10 text-center">
          <Waypoints size={28} className="mx-auto text-faint" />
          <div className="mt-3 font-semibold">No roadmaps yet</div>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Create one per topic to lay out the order you want to learn its decks
            in.
          </p>
          <Button variant="secondary" onClick={newRoadmap} className="mt-4">
            <Plus size={15} /> New roadmap
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-card border border-border bg-panel p-4"
            >
              <Waypoints size={18} className="shrink-0 text-accent" />
              <Link to={`/roadmaps/${r.id}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold hover:text-accent">
                  {r.title}
                </div>
                <div className="text-xs text-muted">
                  {r.nodes.length} deck{r.nodes.length === 1 ? '' : 's'} ·{' '}
                  {r.edges.length} link{r.edges.length === 1 ? '' : 's'}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => deleteRoadmap(r)}
                className="rounded p-1.5 text-muted hover:bg-panel-2 hover:text-red"
                aria-label="Delete roadmap"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
