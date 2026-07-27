import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Folder, Inbox, Layers } from 'lucide-react'
import type { ID } from '@/types'
import {
  buildCollectionTree,
  collectionDeckCount,
  subtreeCollectionIds,
  type CollectionNode,
  type LibraryCollection,
  type LibrarySelection,
} from '../collectionTree'
import { cn } from '@/lib/cn'

export interface NavDeck {
  id: ID
  name: string
  collectionId?: ID
  cardCount?: number
}

// The Collection tree now drills all the way down to individual decks (not
// just Collection nodes) - a deck's row lives nested under its owning
// Collection, matching the reference Library mockup, rather than only being
// reachable from the main content list. Clicking a nested deck row navigates
// straight to it (`/decks/:id`); clicking a Collection row only re-scopes the
// main content list to that Collection (existing `onSelect` behavior,
// unchanged) - the two are deliberately different actions on different rows.
export function CollectionNav({
  collections,
  decks,
  selection,
  activeDeckId,
  onSelect,
}: {
  collections: LibraryCollection[]
  decks: NavDeck[]
  selection: LibrarySelection
  activeDeckId?: ID
  onSelect: (selection: LibrarySelection) => void
}) {
  const navigate = useNavigate()
  const tree = useMemo(() => buildCollectionTree(collections), [collections])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [unfiledExpanded, setUnfiledExpanded] = useState(false)
  const unfiled = decks.filter((d) => !d.collectionId)

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function goToDeck(deckId: ID) {
    navigate(`/decks/${deckId}`)
  }

  return (
    <nav aria-label="Collections">
      <div className="mb-1 px-1">
        <span className="text-xs font-bold uppercase tracking-wide text-itera-muted">
          Collections
        </span>
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
        <span className="flex items-center gap-2">
          <Layers
            size={15}
            className={selection.kind === 'all' ? 'text-itera-accent' : 'text-itera-muted'}
          />
          All Decks
        </span>
        <span className="text-xs font-normal text-itera-muted">{decks.length}</span>
      </button>

      <div className="mt-0.5">
        {tree.map((node) => (
          <CollectionRow
            key={node.collection.id}
            node={node}
            decks={decks}
            selection={selection}
            activeDeckId={activeDeckId}
            collapsed={collapsed}
            onToggle={toggle}
            onSelect={onSelect}
            onSelectDeck={goToDeck}
          />
        ))}
      </div>

      <div className="mt-0.5 flex items-center gap-1">
        {unfiled.length > 0 ? (
          <button
            type="button"
            onClick={() => setUnfiledExpanded((v) => !v)}
            aria-label={unfiledExpanded ? 'Collapse' : 'Expand'}
            className="grid h-5 w-5 flex-none place-items-center text-itera-muted hover:text-itera-ink"
          >
            {unfiledExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5 flex-none" />
        )}
        <button
          type="button"
          onClick={() => onSelect({ kind: 'unfiled' })}
          className={cn(
            'flex flex-1 items-center justify-between rounded-itera-control border-l-2 py-1.5 pr-2 text-left text-sm font-semibold',
            selection.kind === 'unfiled'
              ? 'border-itera-accent text-itera-ink-brand'
              : 'border-transparent text-itera-ink hover:text-itera-ink-brand',
          )}
        >
          <span className="flex items-center gap-2">
            <Inbox
              size={15}
              className={selection.kind === 'unfiled' ? 'text-itera-accent' : 'text-itera-muted'}
            />
            Unfiled Decks
          </span>
          <span className="text-xs font-normal text-itera-muted">{unfiled.length}</span>
        </button>
      </div>
      {unfiledExpanded && (
        <div>
          {[...unfiled]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((deck) => (
              <DeckLeafRow
                key={deck.id}
                deck={deck}
                depth={1}
                active={activeDeckId === deck.id}
                onClick={() => goToDeck(deck.id)}
              />
            ))}
        </div>
      )}
    </nav>
  )
}

function CollectionRow({
  node,
  decks,
  selection,
  activeDeckId,
  collapsed,
  onToggle,
  onSelect,
  onSelectDeck,
}: {
  node: CollectionNode
  decks: NavDeck[]
  selection: LibrarySelection
  activeDeckId?: ID
  collapsed: Set<string>
  onToggle: (id: string) => void
  onSelect: (selection: LibrarySelection) => void
  onSelectDeck: (deckId: ID) => void
}) {
  const hasChildren = node.children.length > 0
  const leaves = useMemo(
    () =>
      decks
        .filter((d) => d.collectionId === node.collection.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [decks, node.collection.id],
  )
  const expandable = hasChildren || leaves.length > 0
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
        {expandable ? (
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
        <Folder
          size={15}
          className={cn('flex-none', isSelected ? 'text-itera-accent' : 'text-itera-muted')}
        />
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
      {expandable && expanded && (
        <div>
          {node.children.map((child) => (
            <CollectionRow
              key={child.collection.id}
              node={child}
              decks={decks}
              selection={selection}
              activeDeckId={activeDeckId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
              onSelectDeck={onSelectDeck}
            />
          ))}
          {leaves.map((deck) => (
            <DeckLeafRow
              key={deck.id}
              deck={deck}
              depth={node.depth + 1}
              active={activeDeckId === deck.id}
              onClick={() => onSelectDeck(deck.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// A single browsable deck nested inside the tree - a small dot (filled
// accent when it's the deck currently open) instead of a folder/file icon,
// matching the reference mockup's leaf rows.
function DeckLeafRow({
  deck,
  depth,
  active,
  onClick,
}: {
  deck: NavDeck
  depth: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 border-l-2 py-1.5 pr-2 text-left text-sm',
        active
          ? 'border-itera-accent font-semibold text-itera-ink-brand'
          : 'border-transparent text-itera-ink hover:text-itera-ink-brand',
      )}
      style={{ paddingLeft: 13 + depth * 16 }}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 flex-none rounded-full',
          active ? 'bg-itera-accent' : 'bg-itera-border',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{deck.name}</span>
      {deck.cardCount !== undefined && (
        <span className="flex-none text-xs font-normal text-itera-muted">{deck.cardCount}</span>
      )}
    </button>
  )
}
