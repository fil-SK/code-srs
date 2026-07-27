import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import type { Deck } from '@/types'
import { DeckMark } from './shared/DeckMark'
import { MeterBar } from './shared/MeterBar'
import { markLabelFor } from './deckMark'
import type { DeckMetrics } from './deckMetrics'
import { formatLastStudied } from '@/features/cardsV2/shared/format'
import { OverflowMenu } from '@/features/cardsV2/shared/OverflowMenu'
import { cn } from '@/lib/cn'

const GRID =
  'grid grid-cols-[minmax(220px,1fr)_70px_70px_110px_150px_40px] items-center gap-3 min-w-[720px]'

export function DeckTableHeader() {
  return (
    <div className={cn(GRID, 'px-1 pb-2 text-xs font-bold uppercase tracking-wide text-itera-muted')}>
      <span>Deck</span>
      <span>Cards</span>
      <span>Due</span>
      <span>Last studied</span>
      <span>Progress</span>
      <span />
    </div>
  )
}

// Divided list row (divide-y on the parent), not an individually bordered
// card — "open rows and separators" per the brief.
export function DeckRow({
  deck,
  metrics,
  now,
  onRename,
  onDelete,
}: {
  deck: Deck
  metrics: DeckMetrics
  now: number
  onRename: (deck: Deck) => void
  onDelete: (deck: Deck, cardCount: number) => void
}) {
  const navigate = useNavigate()
  const pct = Math.round(metrics.masteryFraction * 100)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/decks/${deck.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/decks/${deck.id}`)
      }}
      className={cn(
        GRID,
        'cursor-pointer px-1 py-3 outline-none focus-visible:ring-2 focus-visible:ring-itera-accent',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <DeckMark label={markLabelFor(deck.name)} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">{deck.name}</div>
          {deck.description && (
            <div className="mt-0.5 truncate text-xs text-itera-muted">{deck.description}</div>
          )}
        </div>
      </div>

      <span className="text-sm text-itera-ink">{metrics.cardCount}</span>
      <span className={metrics.dueCount > 0 ? 'text-sm font-semibold text-itera-accent' : 'text-sm text-itera-muted'}>
        {metrics.dueCount > 0 ? metrics.dueCount : '—'}
      </span>
      <span className="text-sm text-itera-muted">{formatLastStudied(metrics.lastStudied, now)}</span>

      <div className="flex items-center gap-2">
        <div className="w-16">
          <MeterBar value={metrics.masteryFraction} />
        </div>
        <span className="text-xs font-semibold text-itera-ink">{pct}%</span>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <OverflowMenu
          ariaLabel="Deck actions"
          items={[
            { label: 'Rename', icon: Pencil, onClick: () => onRename(deck) },
            {
              label: 'Delete',
              icon: Trash2,
              danger: true,
              onClick: () => onDelete(deck, metrics.cardCount),
            },
          ]}
        />
      </div>
    </div>
  )
}
