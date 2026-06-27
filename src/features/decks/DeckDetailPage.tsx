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
import { BookOpen, GripVertical, Play, Plus } from 'lucide-react'
import type { Card } from '@/types'
import { Button } from '@/components/ui/Button'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import {
  useDeleteCard,
  useReorderCards,
  useSaveCard,
  useSearchCards,
} from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
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
}: {
  card: Card
  onToggleSuspend: (card: Card) => void
  onDelete: (card: Card) => void
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
      leading={handle}
      containerRef={setNodeRef}
      style={style}
    />
  )
}

// Open a single deck: its cards as a list, with the same per-card actions as
// Browse (preview / edit / suspend / delete), scoped to this deck only.
export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const decks = useDecks()
  const [showSuspended, setShowSuspended] = useState(false)

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

  const deckPath = useMemo(() => {
    const flat = flattenDeckTree(buildDeckTree(decks.data ?? []))
    return flat.find((d) => d.deck.id === id)?.path
  }, [decks.data, id])

  const saveCard = useSaveCard()
  const deleteCard = useDeleteCard()

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
        </div>
        <div className="flex flex-none items-center gap-2">
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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
