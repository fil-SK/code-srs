import { useNavigate } from 'react-router-dom'
import { DeckMark } from '../library-shared/DeckMark'
import { MeterBar } from '../library-shared/MeterBar'
import { formatLastStudied } from '../library-shared/format'
import type { LibraryDeck } from '../library-shared/fixtures'
import { OverflowMenu } from './OverflowMenu'

// Divided list row (divide-y on the parent), not an individually bordered
// card — "open rows and separators" per the brief.
export function DeckRow({ deck, now }: { deck: LibraryDeck; now: number }) {
  const navigate = useNavigate()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/design-preview/library/${deck.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/design-preview/library/${deck.id}`)
      }}
      className="flex cursor-pointer items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-itera-accent"
    >
      <DeckMark label={deck.markLabel} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-itera-ink-brand">{deck.name}</div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-itera-muted">
          <span>
            {deck.cardCount} card{deck.cardCount === 1 ? '' : 's'}
          </span>
          {deck.dueCount > 0 && <span className="text-itera-accent">{deck.dueCount} due</span>}
          <span>{formatLastStudied(deck.lastStudied, now)}</span>
        </div>
        <div className="mt-1.5 max-w-[220px]">
          <MeterBar value={deck.mastery} />
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <OverflowMenu />
      </div>
    </div>
  )
}
