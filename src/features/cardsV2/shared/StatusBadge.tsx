import type { SchedulingStateKind } from '@/types/review'
import { cn } from '@/lib/cn'

// Renders the real state/suspended split (SchedulingState/CardState) rather
// than a flattened fictional enum — suspension is orthogonal to scheduling
// state, not a fifth state value. Promoted out of design-preview/library-shared
// once the real Deck page needed it too (see docs/itera-decisions.md).
const STATE_META: Record<SchedulingStateKind, { label: string; dotClass: string }> = {
  new: { label: 'New', dotClass: 'bg-blue-500' },
  learning: { label: 'Learning', dotClass: 'bg-amber-500' },
  review: { label: 'Review', dotClass: 'bg-itera-accent' },
  relearning: { label: 'Relearning', dotClass: 'bg-itera-error' },
}

export function StatusBadge({
  state,
  suspended,
}: {
  state: SchedulingStateKind
  suspended: boolean
}) {
  if (suspended) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-itera-muted">
        <span className="h-1.5 w-1.5 flex-none rounded-full bg-itera-muted-light" />
        Suspended
      </span>
    )
  }

  const meta = STATE_META[state]
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-itera-ink">
      <span className={cn('h-1.5 w-1.5 flex-none rounded-full', meta.dotClass)} />
      {meta.label}
    </span>
  )
}
