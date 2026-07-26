import { useNavigate } from 'react-router-dom'
import { DeckMark } from '../library-shared/DeckMark'
import { MeterBar } from '../library-shared/MeterBar'
import { formatLastStudied } from '../library-shared/format'
import type { LibraryDeck } from '../library-shared/fixtures'
import { OverflowMenu } from './OverflowMenu'
import { cn } from '@/lib/cn'

// Mirrors library-deck/CardRow.tsx's grid convention (fixed-width trailing
// columns, a 1fr leading column, an overflow-x-auto ancestor for narrow
// widths) so the two Library table layouts read as one system.
const GRID = 'grid grid-cols-[minmax(220px,1fr)_70px_70px_110px_150px_40px] items-center gap-3 min-w-[720px]'

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
export function DeckRow({ deck, now }: { deck: LibraryDeck; now: number }) {
  const navigate = useNavigate()
  const pct = Math.round(Math.max(0, Math.min(1, deck.mastery)) * 100)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/design-preview/library/${deck.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/design-preview/library/${deck.id}`)
      }}
      className={cn(GRID, 'cursor-pointer px-1 py-3 outline-none focus-visible:ring-2 focus-visible:ring-itera-accent')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <DeckMark label={deck.markLabel} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">{deck.name}</div>
          {deck.description && (
            <div className="mt-0.5 truncate text-xs text-itera-muted">{deck.description}</div>
          )}
        </div>
      </div>

      <span className="text-sm text-itera-ink">{deck.cardCount}</span>
      <span className={deck.dueCount > 0 ? 'text-sm font-semibold text-itera-accent' : 'text-sm text-itera-muted'}>
        {deck.dueCount > 0 ? deck.dueCount : '—'}
      </span>
      <span className="text-sm text-itera-muted">{formatLastStudied(deck.lastStudied, now)}</span>

      <div className="flex items-center gap-2">
        <div className="w-16">
          <MeterBar value={deck.mastery} />
        </div>
        <span className="text-xs font-semibold text-itera-ink">{pct}%</span>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <OverflowMenu />
      </div>
    </div>
  )
}
