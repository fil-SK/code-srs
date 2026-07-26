import { MoreVertical } from 'lucide-react'
import type { LibraryCard } from '../library-shared/fixtures'
import { InteractionTypeTile } from '../library-shared/InteractionTypeBadge'
import { interactionLabel } from '../library-shared/interactionTypeMeta'
import { StatusBadge } from '../library-shared/StatusBadge'
import { formatDue } from '../library-shared/format'
import { cn } from '@/lib/cn'

// min-w guards the 1fr card column from being crushed to near-zero by the
// fixed-width columns when the table is narrower than its content — the
// overflow-x-auto ancestor (LibraryDeckPreviewPage) scrolls instead.
const GRID = 'grid grid-cols-[minmax(220px,1fr)_170px_140px_110px_36px] items-center gap-3 min-w-[660px]'

export function CardTableHeader() {
  return (
    <div className={cn(GRID, 'px-1 pb-2 text-xs font-bold uppercase tracking-wide text-itera-muted')}>
      <span>Card</span>
      <span>Type</span>
      <span>Status</span>
      <span>Due</span>
      <span />
    </div>
  )
}

export function CardRow({ card, now, compact }: { card: LibraryCard; now: number; compact: boolean }) {
  return (
    <div className={cn(GRID, 'px-1', compact ? 'py-2' : 'py-3')}>
      <div className="flex min-w-0 items-center gap-3">
        <InteractionTypeTile type={card.interaction} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">{card.title}</div>
          {!compact && card.tags.length > 0 && (
            <div className="mt-0.5 flex gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-itera-control bg-itera-surface-subtle px-1.5 py-0.5 text-[11px] text-itera-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <span className="text-sm text-itera-ink">{interactionLabel(card.interaction)}</span>
      <StatusBadge state={card.state} suspended={card.suspended} />
      <span className="text-sm text-itera-muted">{formatDue(card.due, now)}</span>
      <button
        type="button"
        aria-label="Card actions"
        className="grid h-8 w-8 place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink"
      >
        <MoreVertical size={16} />
      </button>
    </div>
  )
}
