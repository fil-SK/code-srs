import type { ReactNode } from 'react'

// Generic icon-free empty-state block, reused for: empty library, empty
// collection, no search results, and a missing/empty deck.
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-itera-card border border-dashed border-itera-border px-6 py-16 text-center">
      <p className="text-sm font-semibold text-itera-ink-brand">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-itera-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
