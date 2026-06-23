import type { ReactNode } from 'react'

// Shared input styling used across all card-type editors.
export const fieldClass =
  'w-full rounded-[9px] border border-border bg-code-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent'

export const selectClass =
  'w-full rounded-[9px] border border-border bg-code-bg px-3 py-2 text-sm text-text outline-none focus:border-accent'

// Labeled form field wrapper.
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
