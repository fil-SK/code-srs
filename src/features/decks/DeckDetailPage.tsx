import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BookOpen, GripVertical, Play, Plus, Settings } from 'lucide-react'
import type { Card, Deck } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import {
  buildDeckTree,
  flattenDeckTree,
  subtreeIds,
  type FlatDeck,
} from '@/domain/decks/tree'
import {
  useDeleteCard,
  useMoveCard,
  useReorderCards,
  useSaveCard,
  useSearchCards,
} from '@/hooks/useCards'
import { useDecks, useSaveDeck } from '@/hooks/useDecks'
import { CardRow } from '@/features/cards/CardRow'
import { getCardTitle } from '@/features/cards/cardTypeMeta'

const byOrder = (a: Card, b: Card) =>
  (a.order ?? a.createdAt) - (b.order ?? b.createdAt)

// A CardRow made draggable: the grip handle carries the drag listeners and the
// row container gets the sortable ref/transform.
function SortableCardRow({
  card,
  onToggleSuspend,
  onDelete,
  decks,
  onMove,
}: {
  card: Card
  onToggleSuspend: (card: Card) => void
  onDelete: (card: Card) => void
  decks: FlatDeck[]
  onMove: (card: Card, deckId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative' as const, zIndex: 10 } : {}),
  }
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="ml-1.5 grid h-8 w-6 flex-none cursor-grab touch-none place-items-center rounded text-faint hover:text-text"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} />
    </button>
  )
  return (
    <CardRow
      card={card}
      onToggleSuspend={onToggleSuspend}
      onDelete={onDelete}
      decks={decks}
      onMove={onMove}
      leading={handle}
      containerRef={setNodeRef}
      style={style}
    />
  )
}

// Edit a deck's name, description, and parent. The parent list excludes the
// deck itself and its descendants, so a move can never create a cycle. Setting
// the parent to "Top level" promotes it; moving a deck carries its subtree.
function DeckSettings({ deck, decks }: { deck: Deck; decks: Deck[] }) {
  const save = useSaveDeck()
  const [name, setName] = useState(deck.name)
  const [description, setDescription] = useState(deck.description ?? '')
  const [parentId, setParentId] = useState(deck.parentId ?? '')

  const parentOptions = useMemo(() => {
    const forbidden = new Set(subtreeIds(decks, deck.id))
    return flattenDeckTree(buildDeckTree(decks)).filter(
      (f) => !forbidden.has(f.deck.id),
    )
  }, [decks, deck.id])

  const dirty =
    name.trim() !== deck.name ||
    description.trim() !== (deck.description ?? '') ||
    (parentId || undefined) !== deck.parentId

  function handleSave() {
    if (!name.trim()) return
    save.mutate({
      ...deck,
      name: name.trim(),
      description: description.trim() || undefined,
      parentId: parentId || undefined,
    })
  }

  return (
    <div className="mb-4 space-y-4 rounded-card border border-border bg-panel p-5">
      <Field label="Name">
        <input
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Description (optional)">
        <textarea
          className={fieldClass}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this deck covers…"
        />
      </Field>
      <Field label="Parent deck">
        <select
          className={selectClass}
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">Top level (no parent)</option>
          {parentOptions.map((f) => (
            <option key={f.deck.id} value={f.deck.id}>
              {f.path}
            </option>
          ))}
        </select>
      </Field>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={!dirty || !name.trim() || save.isPending}
      >
        {save.isPending ? 'Saving…' : 'Save deck'}
      </Button>
    </div>
  )
}

// Open a single deck: its cards as a list, with the same per-card actions as
// Browse (preview / edit / suspend / delete), scoped to this deck only.
export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const decks = useDecks()
  const [showSuspended, setShowSuspended] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const cardsQuery = useSearchCards({
    deckId: id,
    includeSuspended: showSuspended,
  })

  // Cards in their manual order (falls back to creation order). Held in local
  // state so a drag reorders instantly; it re-syncs whenever the query changes.
  const sorted = useMemo(
    () => [...(cardsQuery.data ?? [])].sort(byOrder),
    [cardsQuery.data],
  )
  const [cards, setCards] = useState<Card[]>(sorted)
  useEffect(() => setCards(sorted), [sorted])

  const reorder = useReorderCards()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = cards.findIndex((c) => c.id === active.id)
    const to = cards.findIndex((c) => c.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(cards, from, to)
    setCards(next)
    reorder.mutate(next)
  }

  const flatDecks = useMemo(
    () => flattenDeckTree(buildDeckTree(decks.data ?? [])),
    [decks.data],
  )
  const deckPath = useMemo(
    () => flatDecks.find((d) => d.deck.id === id)?.path,
    [flatDecks, id],
  )

  const saveCard = useSaveCard()
  const deleteCard = useDeleteCard()
  const moveCard = useMoveCard()

  function toggleSuspend(card: Card) {
    saveCard.mutate({ ...card, suspended: !card.suspended })
  }

  function remove(card: Card) {
    if (window.confirm(`Delete this card?\n\n“${getCardTitle(card)}”`)) {
      deleteCard.mutate(card.id)
    }
  }

  const deck = decks.data?.find((d) => d.id === id)

  if (!decks.isLoading && !deck) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-dashed border-border bg-panel p-10 text-center">
        <div className="text-lg font-semibold">Deck not found</div>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="primary">Back to decks</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="text-xs text-muted hover:text-text">
        ← Decks
      </Link>

      <div className="mb-5 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{deck?.name ?? 'Deck'}</h1>
          {deckPath && deckPath.includes(' / ') && (
            <div className="truncate text-xs text-faint">{deckPath}</div>
          )}
          {deck?.description && (
            <div className="mt-0.5 text-sm text-muted">{deck.description}</div>
          )}
        </div>
        <div className="flex flex-none items-center gap-2">
          <Button
            variant={settingsOpen ? 'secondary' : 'ghost'}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
          >
            <Settings size={15} /> Deck settings
          </Button>
          {cards.length > 0 && (
            <>
              <Link to={`/preview?deck=${id}`}>
                <Button variant="secondary">
                  <BookOpen size={15} /> Flip through
                </Button>
              </Link>
              <Link to={`/review?deck=${id}`}>
                <Button variant="secondary">
                  <Play size={15} /> Study
                </Button>
              </Link>
            </>
          )}
          <Link to={`/cards/new?deck=${id}`}>
            <Button variant="primary">
              <Plus size={15} /> New card
            </Button>
          </Link>
        </div>
      </div>

      {settingsOpen && deck && (
        <DeckSettings deck={deck} decks={decks.data ?? []} />
      )}

      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          {cardsQuery.isLoading
            ? 'Loading…'
            : `${cards.length} card${cards.length === 1 ? '' : 's'}`}
          {cards.length > 1 && (
            <span className="text-faint"> · drag the handle to reorder</span>
          )}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={showSuspended}
            onChange={(e) => setShowSuspended(e.target.checked)}
          />
          Show suspended
        </label>
      </div>

      {!cardsQuery.isLoading && cards.length === 0 && (
        <div className="rounded-card border border-dashed border-border bg-panel p-10 text-center">
          <p className="text-sm text-muted">No cards in this deck yet.</p>
          <Link to={`/cards/new?deck=${id}`} className="mt-3 inline-block">
            <Button variant="primary">Add a card</Button>
          </Link>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {cards.map((card) => (
              <SortableCardRow
                key={card.id}
                card={card}
                onToggleSuspend={toggleSuspend}
                onDelete={remove}
                decks={flatDecks}
                onMove={(c, deckId) => moveCard.mutate({ card: c, deckId })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
