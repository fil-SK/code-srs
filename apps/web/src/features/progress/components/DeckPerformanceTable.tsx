import { Link } from 'react-router-dom'
import { ChevronRight, Info } from 'lucide-react'
import type { Deck, DeckPerformanceRow } from '@fliptap/core'
import { DeckMark } from '@/features/library/shared/DeckMark'
import { cn } from '@/lib/cn'

function rateTone(value: number | null): string {
  if (value === null) return 'text-fliptap-muted'
  return value >= .8 ? 'text-fliptap-success' : 'text-fliptap-warning'
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_48px_28px_60px_12px] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_56px_32px_68px_90px_12px] sm:gap-x-3'

export function DeckPerformanceTable({ rows, decksById, limit = 4 }: { rows: DeckPerformanceRow[]; decksById: Map<string, Deck>; limit?: number }) {
  const visible = rows.slice(0, limit)
  return (
    <section className="progress-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-fliptap-ink-brand">Deck performance <Info size={14} className="text-fliptap-muted" aria-hidden="true" /></h2>
        <Link to="/decks" className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-fliptap-muted hover:text-fliptap-ink-brand">View all decks<ChevronRight size={14} aria-hidden="true" /></Link>
      </div>
      {visible.length === 0 ? <p className="mt-6 text-sm text-fliptap-muted">No active cards yet.</p> : (
        <div className="mt-4">
          <div className={cn(GRID, 'border-b border-fliptap-border pb-2 text-[10px] font-medium uppercase text-fliptap-muted')}>
            <span>Deck</span><span className="text-center">Learned</span><span className="text-center">Due</span><span className="text-center">Retention</span><span className="hidden sm:block">Cards learned</span><span />
          </div>
          <div className="divide-y divide-fliptap-border">
            {visible.map(({ deckId, learned, active, due, retention }) => {
              const deck = decksById.get(deckId)
              if (!deck) return null
              return (
                <Link key={deckId} to={due > 0 ? `/review?deck=${deckId}` : `/decks/${deckId}`} className={cn(GRID, 'rounded-fliptap-control py-4 transition-colors hover:bg-fliptap-surface-subtle')}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="hidden sm:block"><DeckMark iconId={deck.iconId} /></span>
                    <div className="min-w-0"><div className="truncate text-xs font-semibold text-fliptap-ink-brand">{deck.name}</div><div className="mt-1 text-[10px] text-fliptap-muted">{active} active card{active === 1 ? '' : 's'}</div></div>
                  </div>
                  <span className="text-center text-xs font-semibold text-fliptap-ink">{learned} / {active}</span>
                  <span className="text-center text-xs font-semibold text-fliptap-ink">{due}</span>
                  <span className={cn('text-center text-xs font-semibold', rateTone(retention))}>{retention === null ? '—' : `${Math.round(retention * 100)}%`}</span>
                  <div className="hidden h-1.5 overflow-hidden rounded-full bg-fliptap-navy-soft sm:block" role="progressbar" aria-label={`${deck.name} cards learned`} aria-valuemin={0} aria-valuemax={active} aria-valuenow={learned} aria-valuetext={`${learned} of ${active} active cards learned`}>
                    <div className="h-full rounded-full bg-fliptap-selection-border" style={{ width: `${active ? learned / active * 100 : 0}%` }} />
                  </div>
                  <ChevronRight size={14} className="text-fliptap-muted" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
