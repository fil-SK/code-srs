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
}: {
  current: number
  total: number
  onExit: () => void
  shortcutKey?: string
  shortcutLabel: string
}) {
  return (
    <header className="mb-14 min-h-20 w-full border-b border-itera-border bg-itera-surface px-4 sm:px-6">
      <div className="mx-auto grid min-h-20 w-full max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center">
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
        <strong className="text-sm font-bold text-itera-ink-brand sm:text-base">
          {current} of {total}
        </strong>
        <span className="flex min-w-0 items-center justify-end gap-2 whitespace-nowrap text-itera-muted">
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
