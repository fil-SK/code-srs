import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { BookOpen, ChevronRight, GripVertical, Play, Plus, Settings } from 'lucide-react'
import type { Card } from '@/types'
import { Button } from '@/components/ui/Button'
import { flattenDeckTree, buildDeckTree } from '@/domain/decks/tree'
import { languageLabel } from '@/domain/decks/languages'
import {
  useDeleteCard,
  useMoveCard,
  useReorderCards,
  useSaveCard,
  useSearchCards,
} from '@/hooks/useCards'
import { useSearchCardsV2 } from '@/hooks/useCardsV2'
import { useDecks } from '@/hooks/useDecks'
import { CardRow } from '@/features/cards/CardRow'
import { getCardTitle } from '@/features/cards/cardTypeMeta'
import { CardRowV2 } from '@/features/cardsV2/CardRowV2'
import { DeckMark } from './shared/DeckMark'
import { MasteryRing } from './shared/MasteryRing'
import { EmptyState } from './shared/EmptyState'
import { DeckSettings } from './DeckSettings'
import { markLabelFor } from './deckMark'
import {
  deriveCollections,
  collectionIdFor,
  selectionToSearchParams,
  type LibraryCollection,
} from './collectionTree'
import { computeDeckMetrics, metricsFor } from './deckMetrics'
import { formatLastStudied } from '@/features/cardsV2/shared/format'

const byOrder = (a: Card, b: Card) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)

function collectionPath(collections: LibraryCollection[], collectionId: string | undefined): LibraryCollection[] {
  if (!collectionId) return []
  const byId = new Map(collections.map((c) => [c.id, c]))
  const path: LibraryCollection[] = []
  let current = byId.get(collectionId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

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
  decks: ReturnType<typeof flattenDeckTree>
  onMove: (card: Card, deckId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative' as const, zIndex: 10 } : {}),
  }
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="ml-1.5 grid h-8 w-6 flex-none cursor-grab touch-none place-items-center rounded text-itera-muted-light hover:text-itera-ink"
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

// The focused Deck page (/decks/:id), promoted from design-preview's
// library-deck preview into the real Library. A deck with children is
// reachable here too (a "Collection" is UI-only — see collectionTree.ts) and
// behaves exactly like any other deck: its own cards, not its children (deck
// nesting is browsed from the Library list, same as the old DecksPage tree).
export function LibraryDeckPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const decksQuery = useDecks()
  const [showSuspended, setShowSuspended] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const now = useMemo(() => Date.now(), [])

  const cardsQuery = useSearchCards({ deckId: id, includeSuspended: showSuspended })
  const cardsV2Query = useSearchCardsV2({ deckId: id, includeSuspended: showSuspended })
  const allCards = useSearchCards({ includeSuspended: true })
  const allCardsV2 = useSearchCardsV2({ includeSuspended: true })

  const v2Cards = useMemo(
    () => [...(cardsV2Query.data ?? [])].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)),
    [cardsV2Query.data],
  )

  const sorted = useMemo(() => [...(cardsQuery.data ?? [])].sort(byOrder), [cardsQuery.data])
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

  const decks = decksQuery.data ?? []
  const collections = useMemo(() => deriveCollections(decksQuery.data ?? []), [decksQuery.data])
  const flatDecks = useMemo(
    () => flattenDeckTree(buildDeckTree(decksQuery.data ?? [])),
    [decksQuery.data],
  )

  const saveCard = useSaveCard()
  const deleteCard = useDeleteCard()
  const moveCard = useMoveCard()

  function toggleSuspend(card: Card) {
    saveCard.mutate({ ...card, suspended: !card.suspended })
  }

  function remove(card: Card) {
    if (window.confirm(`Delete this card?\n\n“${getCardTitle(card)}”`)) deleteCard.mutate(card.id)
  }

  const deck = decks.find((d) => d.id === id)

  const v2CountByDeck = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of allCardsV2.data ?? []) map.set(c.deckId, (map.get(c.deckId) ?? 0) + 1)
    return map
  }, [allCardsV2.data])
  const metricsMap = useMemo(
    () => computeDeckMetrics(allCards.data ?? [], [], v2CountByDeck),
    [allCards.data, v2CountByDeck],
  )

  if (!decksQuery.isLoading && !deck) {
    return (
      <EmptyState
        title="Deck not found"
        description="This deck doesn't exist, or may have been deleted."
        action={
          <Link to="/decks">
            <Button variant="primary">Back to Library</Button>
          </Link>
        }
      />
    )
  }

  if (!deck) return null

  const cid = collectionIdFor(deck, collections)
  const path = collectionPath(collections, cid)
  const metrics = metricsFor(metricsMap, deck.id)
  const totalCards = cards.length + v2Cards.length

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-itera-muted">
        <button type="button" onClick={() => navigate('/decks')} className="hover:text-itera-ink">
          Library
        </button>
        {path.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <ChevronRight size={13} />
            <button
              type="button"
              onClick={() => navigate(`/decks?${selectionToSearchParams({ kind: 'collection', id: c.id })}`)}
              className="hover:text-itera-ink"
            >
              {c.name}
            </button>
          </span>
        ))}
        <ChevronRight size={13} />
        <span className="font-medium text-itera-ink">{deck.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <DeckMark label={markLabelFor(deck.name)} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-itera-display text-2xl font-bold tracking-tight text-itera-ink-brand">
                {deck.name}
              </h1>
              {deck.language && (
                <span className="rounded-full bg-itera-navy-soft px-2 py-0.5 text-[11px] font-semibold text-itera-ink-brand">
                  {languageLabel(deck.language)}
                </span>
              )}
            </div>
            {deck.description && <p className="mt-1 max-w-md text-sm text-itera-muted">{deck.description}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-6">
              <Stat label="cards" value={String(totalCards)} />
              <Stat label="due today" value={String(metrics.dueCount)} accent={metrics.dueCount > 0} />
              <Stat label="last studied" value={formatLastStudied(metrics.lastStudied, now)} />
              <div className="flex items-center gap-2">
                <MasteryRing value={metrics.masteryFraction} />
                <div>
                  <div className="font-itera-display text-lg font-bold text-itera-ink-brand">
                    {Math.round(metrics.masteryFraction * 100)}%
                  </div>
                  <div className="text-xs text-itera-muted">reviewed cards</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2">
          <Button
            variant={settingsOpen ? 'secondary' : 'ghost'}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
          >
            <Settings size={15} /> Deck settings
          </Button>
          {totalCards > 0 && (
            <>
              <Link to={`/preview?deck=${id}&from=/decks/${id}`}>
                <Button variant="secondary">
                  <BookOpen size={15} /> Flip through
                </Button>
              </Link>
              <Link to={`/review?deck=${id}`}>
                <Button variant="secondary">
                  <Play size={15} /> Study now
                </Button>
              </Link>
            </>
          )}
          <Link to={`/decks/${id}/cards/new`}>
            <Button variant="primary">
              <Plus size={15} /> New card
            </Button>
          </Link>
        </div>
      </div>

      {settingsOpen && <DeckSettings deck={deck} decks={decks} />}

      <div className="mb-4 mt-6 flex items-center justify-between text-xs text-itera-muted">
        <span>
          {cardsQuery.isLoading || cardsV2Query.isLoading
            ? 'Loading…'
            : `${totalCards} card${totalCards === 1 ? '' : 's'}`}
          {cards.length > 1 && <span className="text-itera-muted-light"> · drag the handle to reorder</span>}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={showSuspended}
            onChange={(e) => setShowSuspended(e.target.checked)}
            className="accent-itera-accent"
          />
          Show suspended
        </label>
      </div>

      {!cardsQuery.isLoading && !cardsV2Query.isLoading && cards.length === 0 && v2Cards.length === 0 && (
        <EmptyState
          title="No cards yet"
          description="This deck doesn't have any cards yet."
          action={
            <Link to={`/decks/${id}/cards/new`}>
              <Button variant="primary">Add a card</Button>
            </Link>
          }
        />
      )}

      {v2Cards.length > 0 && (
        <div className="mb-2.5 space-y-2.5">
          {v2Cards.map((card) => (
            <CardRowV2 key={card.id} card={card} now={now} />
          ))}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`font-itera-display text-lg font-bold ${accent ? 'text-itera-accent' : 'text-itera-ink-brand'}`}>
        {value}
      </div>
      <div className="text-xs text-itera-muted">{label}</div>
    </div>
  )
}
