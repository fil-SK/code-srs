import type { CSSProperties, ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { Card } from '@/types'
import { cn } from '@/lib/cn'
import { CardTypeBadge } from './CardTypeBadge'
import { getCardTitle } from './cardTypeMeta'

// One row in a card list (Browse and the deck detail page). Presentational: the
// parent owns the suspend/delete actions. `leading` (e.g. a drag handle) and the
// container ref/style hooks let a parent make the row sortable.
export function CardRow({
  card,
  onToggleSuspend,
  onDelete,
  leading,
  containerRef,
  style,
}: {
  card: Card
  onToggleSuspend: (card: Card) => void
  onDelete: (card: Card) => void
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
