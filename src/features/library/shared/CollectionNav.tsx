import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Folder, Inbox, Layers, Plus, Settings } from 'lucide-react'
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

// Shared visual language for every selectable row in the tree (All Decks,
// a selected Collection, an active deck leaf): a warm soft-accent
// background with the left accent bar built in via border-l-2, rather than
// the border-only "connector line" treatment this used to lean on for
// indicating selection — matches the reference mockup's selected-row style.
function rowTone(active: boolean) {
  return active
    ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
    : 'border-transparent text-itera-ink hover:bg-itera-surface-subtle hover:text-itera-ink-brand'
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
  onCreateDeck,
}: {
  collections: LibraryCollection[]
  decks: NavDeck[]
  selection: LibrarySelection
  activeDeckId?: ID
  onSelect: (selection: LibrarySelection) => void
  onCreateDeck?: () => void
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
    <div className="flex h-full flex-col p-4">
      <nav aria-label="Collections">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-itera-muted">
            Collections
          </span>
          {onCreateDeck && (
            <button
              type="button"
              onClick={onCreateDeck}
              aria-label="Add deck"
              className="grid h-6 w-6 flex-none place-items-center rounded-itera-control border border-itera-border text-itera-muted hover:border-itera-border-strong hover:bg-itera-surface-subtle hover:text-itera-ink"
            >
              <Plus size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect({ kind: 'all' })}
          className="flex w-full items-center justify-between rounded-r-[9px] border-l-2 border-itera-accent bg-itera-accent-soft px-2.5 py-2 text-left text-sm font-semibold text-itera-ink-brand"
        >
          <span className="flex items-center gap-2">
            <Layers size={15} className="text-itera-accent" />
            All Decks
          </span>
          <span className="text-xs font-medium text-itera-muted">{decks.length}</span>
        </button>

        <div className="mt-1">
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

        <div className="mt-5 border-t border-itera-border pt-3">
          <div className="flex items-center gap-1">
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
                'flex flex-1 items-center justify-between rounded-r-[9px] border-l-2 py-1.5 pr-2 text-left text-sm font-semibold',
                rowTone(selection.kind === 'unfiled'),
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
        </div>
      </nav>

      <Link
        to="/settings"
        className="mt-auto flex items-center gap-2 rounded-itera-control px-2 py-1.5 pt-6 text-left text-sm font-semibold text-itera-muted hover:text-itera-ink-brand"
      >
        <Settings size={15} />
        Settings
      </Link>
    </div>
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
    <div>
      <div
        className={cn('flex items-center gap-1 rounded-r-[9px] border-l-2 py-1.5 pr-2 text-sm', rowTone(isSelected))}
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
            isSelected ? 'font-semibold' : undefined,
          )}
        >
          <span className="truncate">{node.collection.name}</span>
          <span className="flex-none text-xs font-normal text-itera-muted">{count}</span>
        </button>
      </div>
      {expandable && expanded && (
        <div className="border-l border-itera-border" style={{ marginLeft: 17 + node.depth * 16 }}>
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
      className={cn('flex w-full items-center gap-2 rounded-r-[9px] border-l-2 py-1.5 pr-2 text-left text-sm', rowTone(active))}
      style={{ paddingLeft: 13 + depth * 16 }}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 flex-none rounded-full',
          active ? 'bg-itera-accent' : 'bg-itera-border-strong',
        )}
      />
      <span className={cn('min-w-0 flex-1 truncate', active && 'font-semibold')}>{deck.name}</span>
      {deck.cardCount !== undefined && (
        <span className="flex-none text-xs font-normal text-itera-muted">{deck.cardCount}</span>
      )}
    </button>
  )
}
