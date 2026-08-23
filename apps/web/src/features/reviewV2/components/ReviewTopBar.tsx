import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

// The only chrome inside a Review session: exit, position, a context-
// sensitive shortcut hint. No logo, no nav, no deck metadata — spec §15.1
// lists a Review session's global nav/sidebar/logo as things that were
// "tested and rejected because they distract from recall."
export function ReviewTopBar({
  current,
  total,
  onExit,
  shortcutKey,
  shortcutLabel,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}: {
  current: number
  total: number
  onExit: () => void
  shortcutKey?: string
  shortcutLabel: string
  onPrevious?: () => void
  onNext?: () => void
  previousDisabled?: boolean
  nextDisabled?: boolean
}) {
  const showsCardNavigation = Boolean(onPrevious && onNext)

  return (
    <header className="mb-14 min-h-20 w-full border-b border-itera-border bg-itera-surface px-4 sm:px-6">
      <div className="mx-auto grid min-h-20 w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-itera-ink transition-colors hover:text-itera-ink-brand sm:text-base"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            &lt;
          </span>
          Exit session
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {showsCardNavigation && (
            <button
              type="button"
              onClick={onPrevious}
              disabled={previousDisabled}
              aria-label="Previous card"
              aria-keyshortcuts="ArrowLeft"
              title="Previous card (Left arrow)"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-itera-border bg-itera-surface px-2 text-sm font-semibold text-itera-ink transition-colors hover:border-itera-accent hover:text-itera-ink-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-itera-accent disabled:pointer-events-none disabled:opacity-35 lg:px-3"
            >
              <ChevronLeft aria-hidden="true" size={16} strokeWidth={2.25} />
              <span className="hidden lg:inline">Prev</span>
            </button>
          )}
          <strong className="min-w-[4.25rem] text-center text-sm font-bold text-itera-ink-brand sm:text-base">
            {current} of {total}
          </strong>
          {showsCardNavigation && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              aria-label="Next card"
              aria-keyshortcuts="ArrowRight"
              title="Next card (Right arrow)"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-itera-border bg-itera-surface px-2 text-sm font-semibold text-itera-ink transition-colors hover:border-itera-accent hover:text-itera-ink-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-itera-accent disabled:pointer-events-none disabled:opacity-35 lg:px-3"
            >
              <span className="hidden lg:inline">Next</span>
              <ChevronRight aria-hidden="true" size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>
        <span
          className={cn(
            'min-w-0 items-center justify-end gap-2 whitespace-nowrap text-itera-muted',
            showsCardNavigation ? 'hidden sm:flex' : 'flex',
          )}
        >
          {shortcutKey && (
            <kbd className="rounded-[6px] border border-itera-border-strong bg-itera-surface px-2.5 py-1.5 font-sans text-xs font-semibold leading-none text-itera-ink-brand shadow-[0_1px_2px_rgba(30,41,59,0.08)] sm:text-sm">
              {shortcutKey}
            </kbd>
          )}
          <span className="text-sm font-medium sm:text-base">{shortcutLabel}</span>
        </span>
      </div>
    </header>
  )
}
