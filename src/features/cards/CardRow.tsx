import { useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, FolderInput, Trash2 } from 'lucide-react'
import type { Card } from '@/types'
import type { FlatDeck } from '@/domain/decks/tree'
import { cn } from '@/lib/cn'
import { CardTypeBadge } from './CardTypeBadge'
import { getCardTitle } from './cardTypeMeta'

// A button + dropdown for moving a card to another deck.
function MoveMenu({
  card,
  decks,
  onMove,
}: {
  card: Card
  decks: FlatDeck[]
  onMove: (card: Card, deckId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const others = decks.filter((d) => d.deck.id !== card.deckId)

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Move to deck"
        aria-label="Move to another deck"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-text"
      >
        <FolderInput size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-60 rounded-[10px] border border-border bg-panel-2 p-1 shadow-[var(--shadow)]">
            <div className="px-2 py-1 text-xs font-semibold text-faint">
              Move to deck…
            </div>
            {others.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted">
                No other decks.
              </div>
            ) : (
              <ul className="max-h-64 overflow-auto">
                {others.map((d) => (
                  <li key={d.deck.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onMove(card, d.deck.id)
                        setOpen(false)
                      }}
                      className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-panel hover:text-accent"
                    >
                      {d.path}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// One row in a card list (Browse and the deck detail page). Presentational: the
// parent owns the suspend/delete actions. `leading` (e.g. a drag handle) and the
// container ref/style hooks let a parent make the row sortable.
export function CardRow({
  card,
  onToggleSuspend,
  onDelete,
  decks,
  onMove,
  leading,
  containerRef,
  style,
}: {
  card: Card
  onToggleSuspend: (card: Card) => void
  onDelete: (card: Card) => void
  decks?: FlatDeck[]
  onMove?: (card: Card, deckId: string) => void
  leading?: ReactNode
  containerRef?: Ref<HTMLDivElement>
  style?: CSSProperties
}) {
  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-[10px] border border-border bg-panel pr-2',
        card.suspended && 'opacity-55',
      )}
    >
      {leading}
      <Link
        to={`/cards/${card.id}/edit`}
        className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3 hover:text-accent"
      >
        <CardTypeBadge type={card.type} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {getCardTitle(card)}
            {card.suspended && (
              <span className="ml-2 rounded bg-panel-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-faint">
                Suspended
              </span>
            )}
          </div>
          {card.tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-blue">
              {card.tags.map((tag) => (
                <span key={tag} className="font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <Link
        to={`/preview?card=${card.id}`}
        title="Preview"
        aria-label="Preview card"
        className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-text"
      >
        <BookOpen size={16} />
      </Link>
      {decks && onMove && (
        <MoveMenu card={card} decks={decks} onMove={onMove} />
      )}
      <button
        type="button"
        onClick={() => onToggleSuspend(card)}
        title={card.suspended ? 'Unsuspend' : 'Suspend'}
        aria-label={card.suspended ? 'Unsuspend card' : 'Suspend card'}
        className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-text"
      >
        {card.suspended ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(card)}
        title="Delete"
        aria-label="Delete card"
        className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-red/10 hover:text-red"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
