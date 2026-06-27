import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Play, Plus } from 'lucide-react'
import type { Card } from '@/types'
import { Button } from '@/components/ui/Button'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDeleteCard, useSaveCard, useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
import { CardRow } from '@/features/cards/CardRow'
import { getCardTitle } from '@/features/cards/cardTypeMeta'

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

  // Chronological order (how they were added). Manual reordering lands next.
  const cards = useMemo(
    () => [...(cardsQuery.data ?? [])].sort((a, b) => a.createdAt - b.createdAt),
    [cardsQuery.data],
  )

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

      <div className="space-y-2.5">
        {cards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            onToggleSuspend={toggleSuspend}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  )
}
