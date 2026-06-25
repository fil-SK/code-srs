import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Deck } from '@/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { buildDeckTree, type DeckNode } from '@/domain/decks/tree'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useCreateDeck, useDeleteDeck, useDecks, useSaveDeck } from '@/hooks/useDecks'

type CountMap = Record<string, number>

function subtreeCounts(
  node: DeckNode,
  total: CountMap,
  due: CountMap,
): { cards: number; due: number } {
  let cards = total[node.deck.id] ?? 0
  let dueN = due[node.deck.id] ?? 0
  for (const child of node.children) {
    const r = subtreeCounts(child, total, due)
    cards += r.cards
    dueN += r.due
  }
  return { cards, due: dueN }
}

export function DashboardPage() {
  const now = useMemo(() => Date.now(), [])
  const decks = useDecks()
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCards = useDueCards({ now })

  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()
  const deleteDeck = useDeleteDeck()

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const { total, due } = useMemo(() => {
    const total: CountMap = {}
    const due: CountMap = {}
    allCards.data?.forEach((c) => {
      total[c.deckId] = (total[c.deckId] ?? 0) + 1
    })
    dueCards.data?.forEach((c) => {
      due[c.deckId] = (due[c.deckId] ?? 0) + 1
    })
    return { total, due }
  }, [allCards.data, dueCards.data])

  const tree = useMemo(() => buildDeckTree(decks.data ?? []), [decks.data])

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function newRoot() {
    const name = window.prompt('New deck name')?.trim()
    if (name) createDeck.mutate({ name })
  }

  function newSub(parentId: string) {
    const name = window.prompt('New subdeck name')?.trim()
    if (name) createDeck.mutate({ name, parentId })
  }

  function rename(d: Deck) {
    const name = window.prompt('Deck name', d.name)?.trim()
    if (name && name !== d.name) saveDeck.mutate({ ...d, name })
  }

  function remove(node: DeckNode) {
    if (node.children.length > 0) {
      window.alert(
        `“${node.deck.name}” has subdecks. Delete or move them before deleting it.`,
      )
      return
    }
    const ownCards = total[node.deck.id] ?? 0
    if (ownCards > 0) {
      window.alert(
        `“${node.deck.name}” has ${ownCards} card${ownCards === 1 ? '' : 's'}. Move or delete them first.`,
      )
      return
    }
    if (window.confirm(`Delete deck “${node.deck.name}”?`)) {
      deleteDeck.mutate(node.deck.id)
    }
  }

  const totalDue = dueCards.data?.length ?? 0
  const totalCards = allCards.data?.length ?? 0

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Due today" value={totalDue} hint="ready to review" />
        <Stat label="Cards" value={totalCards} hint="across all decks" />
        <Stat label="Decks" value={decks.data?.length ?? 0} hint="incl. subdecks" />
      </div>

      {totalDue > 0 && (
        <Link to="/review" className="mt-4 inline-block">
          <Button variant="primary">Study {totalDue} due now</Button>
        </Link>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
          Decks
        </h2>
        <Button variant="ghost" onClick={newRoot}>
          <Plus size={14} /> New deck
        </Button>
      </div>

      {tree.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
          No decks yet. Create one (and nest subdecks inside it), or just make a
          card — an “Inbox” deck is created automatically.
        </p>
      ) : (
        <div className="space-y-1.5">
          {tree.map((node) => (
            <DeckRow
              key={node.deck.id}
              node={node}
              total={total}
              due={due}
              collapsed={collapsed}
              onToggle={toggle}
              onNewSub={newSub}
              onRename={rename}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DeckRow({
  node,
  total,
  due,
  collapsed,
  onToggle,
  onNewSub,
  onRename,
  onDelete,
}: {
  node: DeckNode
  total: CountMap
  due: CountMap
  collapsed: Set<string>
  onToggle: (id: string) => void
  onNewSub: (parentId: string) => void
  onRename: (deck: Deck) => void
  onDelete: (node: DeckNode) => void
}) {
  const hasChildren = node.children.length > 0
  const expanded = !collapsed.has(node.deck.id)
  const counts = subtreeCounts(node, total, due)

  return (
    <>
      <div
        className="flex items-center gap-2 rounded-[10px] border border-border bg-panel py-2.5 pr-2"
        style={{ paddingLeft: 10 + node.depth * 18 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.deck.id)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="grid h-6 w-6 flex-none place-items-center rounded text-muted hover:text-text"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="h-6 w-6 flex-none" />
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{node.deck.name}</div>
          <div className="text-xs text-faint">
            {counts.cards} card{counts.cards === 1 ? '' : 's'}
            {counts.due > 0 && (
              <span className="text-accent"> · {counts.due} due</span>
            )}
          </div>
        </div>

        <RowButton title="New subdeck" onClick={() => onNewSub(node.deck.id)}>
          <FolderPlus size={15} />
        </RowButton>
        <RowButton title="Rename" onClick={() => onRename(node.deck)}>
          <Pencil size={15} />
        </RowButton>
        <RowButton title="Delete" danger onClick={() => onDelete(node)}>
          <Trash2 size={15} />
        </RowButton>
      </div>

      {hasChildren && expanded && (
        <div className="space-y-1.5">
          {node.children.map((child) => (
            <DeckRow
              key={child.deck.id}
              node={child}
              total={total}
              due={due}
              collapsed={collapsed}
              onToggle={onToggle}
              onNewSub={onNewSub}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  )
}

function RowButton({
  title,
  danger,
  onClick,
  children,
}: {
  title: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 flex-none place-items-center rounded-lg text-muted',
        danger ? 'hover:bg-red/10 hover:text-red' : 'hover:bg-panel-2 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-card border border-border bg-panel p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-faint">{hint}</div>
    </div>
  )
}
