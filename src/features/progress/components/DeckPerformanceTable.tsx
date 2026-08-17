import { Link } from 'react-router-dom'
import { ChevronRight, Info } from 'lucide-react'
import type { Deck } from '@/types'
import type { DeckPerformanceRow } from '@/domain/stats/progressMetrics'
import { DeckMark } from '@/features/library/shared/DeckMark'
import { markLabelFor } from '@/features/library/deckMark'
import { cn } from '@/lib/cn'
import { Sparkline } from './Sparkline'

function rateTone(value: number | null): string {
  if (value === null) return 'text-itera-muted'
  return value >= 0.8 ? 'text-itera-success' : 'text-itera-warning'
}

const GRID = 'grid grid-cols-[minmax(120px,1fr)_60px_66px_66px_56px_18px] items-center gap-2 min-w-[420px]'

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
          <p className="mt-4 text-sm text-itera-muted">No reviews in this range yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
          <div className={cn(GRID, 'px-1 pb-2 text-xs font-bold uppercase tracking-wide text-itera-muted')}>
            <span>Deck</span>
            <span>Reviewed</span>
            <span>Retention</span>
            <span>Accuracy</span>
            <span>Trend</span>
            <span />
          </div>
          <div className="divide-y divide-itera-border">
            {visible.map(({ deckId, reviewed, retention, accuracy, trendSeries }) => {
              const deck = decksById.get(deckId)
              if (!deck) return null
              const trendUp = trendSeries.length >= 2 && trendSeries[trendSeries.length - 1] >= trendSeries[0]
              return (
                <Link key={deckId} to={`/decks/${deckId}`} className={cn(GRID, 'py-3')}>
                  <div className="flex min-w-0 items-center gap-3">
                    <DeckMark label={markLabelFor(deck.name)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-itera-ink-brand">{deck.name}</div>
                      {deck.description && (
                        <div className="mt-0.5 truncate text-xs text-itera-muted">{deck.description}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-itera-ink">{reviewed}</span>
                  <span className={cn('text-sm font-semibold', rateTone(retention))}>
                    {retention === null ? '—' : `${Math.round(retention * 100)}%`}
                  </span>
                  <span className={cn('text-sm font-semibold', rateTone(accuracy))}>
                    {accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`}
                  </span>
                  <Sparkline
                    values={trendSeries}
                    color={trendUp ? 'var(--itera-success)' : 'var(--itera-warning)'}
                  />
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
