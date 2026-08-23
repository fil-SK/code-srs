import { Link } from 'react-router-dom'
import { ChevronRight, Info } from 'lucide-react'
import type { Deck } from '@/types'
import type { DeckPerformanceRow } from '@/domain/stats/progressMetrics'
import { DeckMark } from '@/features/library/shared/DeckMark'
import { markLabelFor } from '@/features/library/deckMark'
import { cn } from '@/lib/cn'

function rateTone(value: number | null): string {
  if (value === null) return 'text-itera-muted'
  return value >= 0.8 ? 'text-itera-success' : 'text-itera-warning'
}

const GRID =
  'grid min-w-[300px] grid-cols-[minmax(105px,1fr)_58px_32px_62px_14px] items-center gap-1 sm:min-w-[390px] sm:grid-cols-[minmax(150px,1fr)_72px_48px_76px_18px] sm:gap-2'

export function DeckPerformanceTable({
  rows,
  decksById,
  limit = 4,
}: {
  rows: DeckPerformanceRow[]
  decksById: Map<string, Deck>
  limit?: number
}) {
  const visible = rows.slice(0, limit)

  return (
    <div className="overflow-hidden rounded-itera-card border border-itera-border bg-itera-surface shadow-[var(--itera-shadow-card)]">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-itera-ink-brand">Deck performance</h3>
          <Info size={14} strokeWidth={1.9} className="text-itera-muted" aria-hidden="true" />
        </div>

        {visible.length === 0 ? (
          <p className="mt-4 text-sm text-itera-muted">No active cards yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <div
              className={cn(
                GRID,
                'px-1 pb-2 text-xs font-bold uppercase tracking-wide text-itera-muted',
              )}
            >
              <span>Deck</span>
              <span>Learned</span>
              <span>Due</span>
              <span>Retention</span>
              <span />
            </div>
            <div className="divide-y divide-itera-border">
              {visible.map(({ deckId, learned, active, due, retention }) => {
                const deck = decksById.get(deckId)
                if (!deck) return null
                return (
                  <Link
                    key={deckId}
                    to={due > 0 ? `/review?deck=${deckId}` : `/decks/${deckId}`}
                    className={cn(GRID, 'py-3')}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <DeckMark label={markLabelFor(deck.name)} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-itera-ink-brand">
                          {deck.name}
                        </div>
                        {deck.description && (
                          <div className="mt-0.5 truncate text-xs text-itera-muted">
                            {deck.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-itera-ink">
                      {learned} / {active}
                    </span>
                    <span className="text-sm font-semibold text-itera-ink">{due}</span>
                    <span className={cn('text-sm font-semibold', rateTone(retention))}>
                      {retention === null ? '—' : `${Math.round(retention * 100)}%`}
                    </span>
                    <ChevronRight size={16} className="text-itera-muted" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Link
        to="/decks"
        className="flex items-center justify-center gap-1 border-t border-itera-border px-5 py-3.5 text-sm font-semibold text-itera-ink-brand hover:bg-itera-surface-subtle"
      >
        View all decks
        <ChevronRight size={14} />
      </Link>
    </div>
  )
}
