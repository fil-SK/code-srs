import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react'
import { cn } from '@/lib/cn'

// The real shortcuts that exist today (Review's flip/rate keys, Preview's
// arrow-key navigation) — a static popover rather than a link to a
// shortcuts page, since no such page exists in the app yet.
function ShortcutsPopover({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const rows: { keys: string; description: string }[] = [
    { keys: 'Space', description: 'Flip the card' },
    { keys: '1 – 4', description: 'Rate the card' },
    { keys: '← / →', description: 'Move between cards in Preview' },
  ]

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Keyboard shortcuts"
      className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-itera-control border border-itera-border bg-itera-surface p-3 shadow-[var(--itera-shadow-float)]"
    >
      <div className="mb-2 text-sm font-semibold text-itera-ink-brand">Keyboard shortcuts</div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.keys} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-itera-muted">{row.description}</span>
            <kbd className="rounded border border-itera-border bg-itera-surface-subtle px-1.5 py-0.5 font-mono text-xs text-itera-ink-brand">
              {row.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

// Item-count + pagination + a quiet tip strip, replacing LibraryTip's old
// sidebar placement (product feedback: the mockup moves it to the Cards-tab
// footer instead). Pagination is only shown once there's more than one page;
// the count/pagination row always renders. `itemLabel` lets non-Card lists
// (e.g. a Collection's child-Deck list) reuse the same footer rhythm without
// saying "card"; `showTip` hides the Review-specific keyboard tip for lists
// where "press Space to reveal answer" isn't relevant (see
// LibraryCollectionView.tsx's Decks section).
export function CardListFooter({
  count,
  page,
  totalPages,
  onPageChange,
  itemLabel = 'card',
  showTip = true,
  pageSize,
}: {
  count: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  itemLabel?: string
  showTip?: boolean
  pageSize?: number
}) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const rangeStart = pageSize ? (page - 1) * pageSize + 1 : 1
  const rangeEnd = pageSize ? Math.min(page * pageSize, count) : count

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-sm text-itera-muted">
          {totalPages > 1 && pageSize
            ? `Showing ${rangeStart}-${rangeEnd} of ${count} ${itemLabel}s`
            : `${count} ${itemLabel}${count === 1 ? '' : 's'}`}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="grid h-8 w-8 place-items-center rounded-itera-control border border-itera-border text-itera-muted disabled:pointer-events-none disabled:opacity-40 hover:text-itera-ink"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-itera-control border text-sm font-semibold',
                  p === page
                    ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                    : 'border-itera-border text-itera-muted hover:text-itera-ink',
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="grid h-8 w-8 place-items-center rounded-itera-control border border-itera-border text-itera-muted disabled:pointer-events-none disabled:opacity-40 hover:text-itera-ink"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {showTip && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-itera-card border border-itera-border bg-itera-surface px-5 py-4 text-sm text-itera-muted">
          <Keyboard size={21} className="text-itera-muted" />
          <span className="font-semibold text-itera-ink-brand">Tip:</span>
          <span>Press</span>
          <kbd className="rounded border border-itera-border bg-itera-surface px-1.5 py-0.5 font-mono text-xs font-semibold text-itera-ink-brand">
            Space
          </kbd>
          <span>to reveal answer during review</span>
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="inline-flex items-center gap-0.5 font-semibold text-itera-accent hover:brightness-90"
            >
              View keyboard shortcuts
              <ChevronRight size={13} />
            </button>
            {showShortcuts && <ShortcutsPopover onClose={() => setShowShortcuts(false)} />}
          </div>
        </div>
      )}
    </div>
  )
}
