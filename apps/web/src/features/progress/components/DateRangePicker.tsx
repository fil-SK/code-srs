import { useEffect, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown } from 'lucide-react'
import { DATE_RANGE_PRESETS, formatRangeLabel, type DateRange, type DateRangePreset } from '@/domain/stats/dateRange'

// Bespoke rather than RowFilterDropdown (library/shared): the trigger shows
// the resolved date range ("May 5 – Jun 1, 2025"), not the preset's own
// label, matching the mockup — RowFilterDropdown always echoes the selected
// option's label verbatim.
export function DateRangePicker({
  preset,
  range,
  onChange,
}: {
  preset: DateRangePreset
  range: DateRange
  onChange: (preset: DateRangePreset) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        aria-label="Select progress date range"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-fliptap-control border border-fliptap-border bg-fliptap-surface px-3 py-2 text-sm font-medium text-fliptap-ink-brand shadow-[var(--fliptap-shadow-card)] hover:border-fliptap-border-strong"
      >
        <Calendar size={14} className="text-fliptap-muted" />
        {formatRangeLabel(range)}
        <ChevronDown size={14} className="text-fliptap-muted" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-48 rounded-fliptap-control border border-fliptap-border bg-fliptap-surface py-1 shadow-[var(--fliptap-shadow-float)]"
        >
          {DATE_RANGE_PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === preset}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-fliptap-ink hover:bg-fliptap-surface-subtle"
            >
              {option.label}
              {option.value === preset && <Check size={14} className="text-fliptap-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
