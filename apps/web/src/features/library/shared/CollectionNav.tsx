import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, ChevronDown, ChevronRight, Folder, Plus, Server, Settings } from 'lucide-react'
import type { ID } from '@/types'
import {
  buildCollectionTree,
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
    ? 'bg-fliptap-accent-soft text-fliptap-ink-brand'
    : 'text-fliptap-ink hover:bg-fliptap-surface-subtle hover:text-fliptap-ink-brand'
}

function cardCountFor(collectionIds: string[], decks: NavDeck[]) {
  return decks
    .filter((deck) => deck.collectionId && collectionIds.includes(deck.collectionId))
    .reduce((total, deck) => total + (deck.cardCount ?? 0), 0)
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
  const totalCards = decks.reduce((total, deck) => total + (deck.cardCount ?? 0), 0)
  const unfiledCards = unfiled.reduce((total, deck) => total + (deck.cardCount ?? 0), 0)

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
    <div className="flex h-full flex-col px-4 py-5">
      <nav aria-label="Collections">
        <div className="mb-3 flex items-center justify-between px-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-fliptap-muted">
            Collections
          </span>
          {onCreateDeck && (
            <button
              type="button"
              onClick={onCreateDeck}
              aria-label="Add deck"
              className="grid h-8 w-8 flex-none place-items-center rounded-fliptap-control border border-fliptap-border-strong bg-fliptap-surface text-fliptap-ink-brand transition-colors hover:border-fliptap-accent hover:text-fliptap-accent"
            >
              <Plus size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect({ kind: 'all' })}
          className="relative flex w-full items-center justify-between rounded-r-[9px] bg-fliptap-accent-soft px-3 py-2.5 text-left text-sm font-semibold text-fliptap-ink-brand before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-r-full before:bg-fliptap-accent"
        >
          <span className="flex items-center gap-3">
            <Server size={17} strokeWidth={1.8} />
            All Decks
          </span>
          <span className="text-xs font-medium text-fliptap-ink-brand">{totalCards}</span>
        </button>

        <div className="mt-2 space-y-0.5">
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

        <div className="mt-5 border-t border-fliptap-border pt-3">
          <div className="flex items-center gap-1">
            {unfiled.length > 0 ? (
              <button
                type="button"
                onClick={() => setUnfiledExpanded((v) => !v)}
                aria-label={unfiledExpanded ? 'Collapse' : 'Expand'}
                className="grid h-5 w-5 flex-none place-items-center text-fliptap-muted hover:text-fliptap-ink"
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
                'flex flex-1 items-center justify-between rounded-[9px] py-2 pr-2 text-left text-sm font-semibold',
                rowTone(selection.kind === 'unfiled'),
              )}
            >
              <span className="flex items-center gap-3">
                <Archive
                  size={17}
                  strokeWidth={1.8}
                  className={selection.kind === 'unfiled' ? 'text-fliptap-accent' : 'text-fliptap-ink-brand'}
                />
                Unfiled Decks
              </span>
              <span className="text-xs font-normal text-fliptap-muted">{unfiledCards}</span>
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
        className="mt-auto flex items-center gap-3 rounded-fliptap-control px-3 pb-1 pt-8 text-left text-sm font-semibold text-fliptap-ink hover:text-fliptap-accent"
      >
        <Settings size={17} strokeWidth={1.8} />
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
  const collectionIds = subtreeCollectionIds(node)
  const count = cardCountFor(collectionIds, decks)

  return (
    <div>
      <div
        className={cn('flex items-center gap-2 rounded-[9px] py-2 pr-2 text-sm', rowTone(isSelected))}
        style={{ paddingLeft: 10 + node.depth * 16 }}
      >
        <Folder
          size={17}
          strokeWidth={1.8}
          className={cn('flex-none', isSelected ? 'text-fliptap-accent' : 'text-fliptap-ink-brand')}
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
        </button>
        {expandable ? (
          <button
            type="button"
            onClick={() => onToggle(node.collection.id)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="grid h-5 w-5 flex-none place-items-center text-fliptap-ink-brand hover:text-fliptap-accent"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5 flex-none" />
        )}
        <span className="w-6 flex-none text-right text-xs font-normal text-fliptap-muted">{count}</span>
      </div>
      {expandable && expanded && (
        <div className="border-l border-fliptap-border" style={{ marginLeft: 18 + node.depth * 16 }}>
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
      className={cn('relative flex w-full items-center gap-2.5 rounded-r-[9px] py-2 pr-2 text-left text-sm before:absolute before:left-0 before:top-1/2 before:h-px before:w-3 before:bg-fliptap-border', rowTone(active))}
      style={{ paddingLeft: 14 + (depth - 1) * 16 }}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 flex-none rounded-full',
          active ? 'bg-fliptap-accent' : 'bg-fliptap-border-strong',
        )}
      />
      <span className={cn('min-w-0 flex-1 truncate', active && 'font-semibold')}>{deck.name}</span>
      {deck.cardCount !== undefined && (
        <span className="flex-none text-xs font-normal text-fliptap-muted">{deck.cardCount}</span>
      )}
    </button>
  )
}
