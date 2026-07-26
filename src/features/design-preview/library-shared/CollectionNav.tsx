import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { LibraryCollection, LibraryDeck } from './fixtures'
import {
  buildCollectionTree,
  collectionDeckCount,
  subtreeCollectionIds,
  type CollectionNode,
  type LibrarySelection,
} from './collectionTree'
import { cn } from '@/lib/cn'

export type { LibrarySelection } from './collectionTree'

export function CollectionNav({
  collections,
  decks,
  selection,
  onSelect,
}: {
  collections: LibraryCollection[]
  decks: LibraryDeck[]
  selection: LibrarySelection
  onSelect: (selection: LibrarySelection) => void
}) {
  const tree = useMemo(() => buildCollectionTree(collections), [collections])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const unfiledCount = decks.filter((d) => !d.collectionId).length

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <nav aria-label="Collections">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wide text-itera-muted">Collections</span>
        {/* Inert stub, same treatment as "New Deck" and OverflowMenu's
            Rename/Move/Delete — Create/Import is out of scope for this
            preview. Presence reverses D56's omission per an explicit new
            ask; see docs/itera-decisions.md. */}
        <button
          type="button"
          aria-label="Add collection"
          className="grid h-5 w-5 place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink"
        >
          <Plus size={13} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onSelect({ kind: 'all' })}
        className={cn(
          'flex w-full items-center justify-between rounded-itera-control border-l-2 px-2 py-1.5 text-left text-sm font-semibold',
          selection.kind === 'all'
            ? 'border-itera-accent text-itera-ink-brand'
            : 'border-transparent text-itera-ink hover:text-itera-ink-brand',
        )}
      >
        <span>All Decks</span>
        <span className="text-xs font-normal text-itera-muted">{decks.length}</span>
      </button>

      <div className="mt-0.5">
        {tree.map((node) => (
          <CollectionRow
            key={node.collection.id}
            node={node}
            decks={decks}
            selection={selection}
            collapsed={collapsed}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect({ kind: 'unfiled' })}
        className={cn(
          'mt-0.5 flex w-full items-center justify-between rounded-itera-control border-l-2 px-2 py-1.5 text-left text-sm font-semibold',
          selection.kind === 'unfiled'
            ? 'border-itera-accent text-itera-ink-brand'
            : 'border-transparent text-itera-ink hover:text-itera-ink-brand',
        )}
      >
        <span>Unfiled Decks</span>
        <span className="text-xs font-normal text-itera-muted">{unfiledCount}</span>
      </button>
    </nav>
  )
}

function CollectionRow({
  node,
  decks,
  selection,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: CollectionNode
  decks: LibraryDeck[]
  selection: LibrarySelection
  collapsed: Set<string>
  onToggle: (id: string) => void
  onSelect: (selection: LibrarySelection) => void
}) {
  const hasChildren = node.children.length > 0
  const expanded = !collapsed.has(node.collection.id)
  const isSelected = selection.kind === 'collection' && selection.id === node.collection.id
  const count = collectionDeckCount(subtreeCollectionIds(node), decks)

  return (
    <div className={node.depth > 0 ? 'border-l border-itera-border' : undefined}>
      <div
        className={cn(
          'flex items-center gap-1 border-l-2 py-1.5 pr-2 text-sm',
          isSelected ? 'border-itera-accent' : 'border-transparent',
        )}
        style={{ paddingLeft: 8 + node.depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.collection.id)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="grid h-5 w-5 flex-none place-items-center text-itera-muted hover:text-itera-ink"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5 flex-none" />
        )}
        <button
          type="button"
          onClick={() => onSelect({ kind: 'collection', id: node.collection.id })}
          className={cn(
            'flex min-w-0 flex-1 items-center justify-between gap-2 text-left',
            isSelected
              ? 'font-semibold text-itera-ink-brand'
              : 'text-itera-ink hover:text-itera-ink-brand',
          )}
        >
          <span className="truncate">{node.collection.name}</span>
          <span className="flex-none text-xs font-normal text-itera-muted">{count}</span>
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <CollectionRow
              key={child.collection.id}
              node={child}
              decks={decks}
              selection={selection}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
