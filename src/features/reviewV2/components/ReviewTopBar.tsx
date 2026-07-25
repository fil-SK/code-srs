import { ArrowLeft } from 'lucide-react'

// The only chrome inside a Review session: exit, position, a context-
// sensitive shortcut hint. No logo, no nav, no deck metadata — spec §15.1
// lists a Review session's global nav/sidebar/logo as things that were
// "tested and rejected because they distract from recall."
export function ReviewTopBar({
  current,
  total,
  onExit,
  shortcutHint,
}: {
  current: number
  total: number
  onExit: () => void
  shortcutHint: string
}) {
  return (
    <div className="mb-6 flex items-center justify-between text-sm">
      <button
        type="button"
        onClick={onExit}
        className="inline-flex items-center gap-1.5 font-medium text-itera-muted hover:text-itera-ink"
      >
        <ArrowLeft size={15} /> Exit session
      </button>
      <span className="font-medium text-itera-muted">
        {current} of {total}
      </span>
      <span className="font-mono text-xs text-itera-muted-light">
        {shortcutHint}
      </span>
    </div>
  )
}
