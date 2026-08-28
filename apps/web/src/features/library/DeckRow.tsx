import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import type { Deck } from '@/types'
import { DeckMark } from './shared/DeckMark'
import { MeterBar } from './shared/MeterBar'
import { markLabelFor } from './deckMark'
import type { DeckMetrics } from '@/domain/stats/deckMetrics'
import { formatLastStudied } from '@/features/cards/shared/format'
import { OverflowMenu } from '@/features/cards/shared/OverflowMenu'
import { cn } from '@/lib/cn'

const GRID =
  'grid grid-cols-[minmax(220px,1fr)_70px_70px_110px_150px_40px] items-center gap-3 min-w-[720px]'
const ALL_DECKS_GRID =
  'grid grid-cols-[minmax(280px,1fr)_74px_74px_120px_170px_36px] items-center gap-3 min-w-[800px]'

export function DeckTableHeader({ allDecks = false }: { allDecks?: boolean }) {
  return (
    <div
      className={cn(
        allDecks ? ALL_DECKS_GRID : GRID,
        'pb-3 text-xs font-bold uppercase tracking-wide text-itera-muted',
        !allDecks && 'px-1 pb-2',
      )}
    >
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
  allDecks = false,
}: {
  deck: Deck
  metrics: DeckMetrics
  now: number
  onRename: (deck: Deck) => void
  onDelete: (deck: Deck, cardCount: number) => void
  allDecks?: boolean
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
        allDecks ? ALL_DECKS_GRID : GRID,
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-itera-accent',
        // The most-clicked row in the app had no pointer feedback at all: the
        // cursor changed and nothing else did. The negative margin lets the
        // highlight reach past the table's own padding without moving any
        // content inside the row.
        '-mx-2 rounded-itera-control px-2 transition-colors hover:bg-itera-surface-subtle',
        allDecks ? 'py-3.5' : 'py-3',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <DeckMark label={markLabelFor(deck.name)} size={allDecks ? 'md' : 'sm'} />
        <div className="min-w-0">
          <div className={cn('truncate font-semibold text-itera-ink-brand', allDecks ? 'text-[15px]' : 'text-sm')}>
            {deck.name}
          </div>
          {deck.description && (
            <div className={cn('mt-0.5 truncate text-itera-muted', allDecks ? 'text-[13px]' : 'text-xs')}>
              {deck.description}
            </div>
          )}
        </div>
      </div>

      <span
        className={cn(
          'text-itera-ink',
          allDecks ? 'text-sm font-bold leading-5 tabular-nums' : 'text-sm',
        )}
      >
        {metrics.cardCount}
      </span>
      <span
        className={
          metrics.dueCount > 0
            ? cn(
                'text-sm text-itera-accent',
                allDecks ? 'font-bold leading-5 tabular-nums' : 'font-semibold',
              )
            : cn(
                'text-sm text-itera-muted',
                allDecks && 'font-bold leading-5 tabular-nums',
              )
        }
      >
        {metrics.dueCount > 0 ? metrics.dueCount : '—'}
      </span>
      <span
        className={cn(
          'whitespace-nowrap text-sm text-itera-muted',
          allDecks && 'font-bold leading-5 tabular-nums',
        )}
      >
        {formatLastStudied(metrics.lastStudied, now)}
      </span>

      <div className="flex items-center gap-2">
        <div className={allDecks ? 'w-[74px]' : 'w-16'}>
          <MeterBar value={metrics.masteryFraction} />
        </div>
        <span
          className={cn(
            'text-itera-ink',
            allDecks
              ? 'text-sm font-bold leading-5 tabular-nums'
              : 'text-xs font-semibold',
          )}
        >
          {pct}%
        </span>
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
