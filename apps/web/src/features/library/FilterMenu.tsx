import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Funnel, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

// Compact dropdown-style Filter control, same open/outside-click-close idiom
// as the deck row's overflow menu.
export function FilterMenu({
  dueOnly,
  onDueOnlyChange,
  referenceStyle = false,
}: {
  dueOnly: boolean
  onDueOnlyChange: (value: boolean) => void
  referenceStyle?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeCount = dueOnly ? 1 : 0

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center rounded-itera-control border text-sm font-semibold',
          referenceStyle
            ? 'h-11 min-w-[136px] justify-between gap-3 bg-itera-surface px-4'
            : 'gap-1.5 px-3 py-2',
          activeCount > 0
            ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
            : 'border-itera-border text-itera-ink hover:border-itera-border-strong',
        )}
      >
        {referenceStyle ? <Funnel size={17} strokeWidth={1.8} /> : <SlidersHorizontal size={14} />}
        Filter
        {activeCount > 0 && <span className="text-itera-accent">· {activeCount}</span>}
        <ChevronDown size={referenceStyle ? 15 : 14} strokeWidth={referenceStyle ? 1.8 : 2} />
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
