import { useEffect, useRef, useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

// Compact dropdown-style Filter control, same open/outside-click-close idiom
// as OverflowMenu.tsx. Wraps the existing "due only" toggle in a popover
// instead of a bare checkbox — no new filter criteria invented.
export function FilterMenu({
  dueOnly,
  onDueOnlyChange,
}: {
  dueOnly: boolean
  onDueOnlyChange: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeCount = dueOnly ? 1 : 0

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-itera-control border px-3 py-2 text-sm font-semibold',
          activeCount > 0
            ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
            : 'border-itera-border text-itera-ink hover:border-itera-border-strong',
        )}
      >
        <SlidersHorizontal size={14} />
        Filter
        {activeCount > 0 && <span className="text-itera-accent">· {activeCount}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-48 rounded-itera-control border border-itera-border bg-itera-surface p-2 shadow-[var(--itera-shadow-float)]">
          <label className="flex items-center gap-2 rounded-itera-control px-2 py-1.5 text-sm text-itera-ink hover:bg-itera-surface-subtle">
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => onDueOnlyChange(e.target.checked)}
              className="accent-itera-accent"
            />
            Due only
          </label>
        </div>
      )}
    </div>
  )
}
