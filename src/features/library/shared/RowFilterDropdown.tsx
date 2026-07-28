import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DropdownOption {
  value: string
  label: string
}

// Single-select dropdown *button* (not a native <select>) for the Deck
// page's Type/Status/Sort toolbar controls. Generalizes FilterMenu.tsx's
// open/outside-click-close idiom to one value instead of a checkbox.
// Deliberately not built on Field.tsx's selectClass: that class bakes in
// `w-full`, and appending `w-auto` at a call site doesn't reliably win the
// Tailwind cascade — the previous native-<select> toolbar rendered as
// stacked full-width rows instead of one line because of exactly this.
// `showValueWhenDefault` controls whether the trigger always shows the
// current option's label ("Sort: Due soon") or only once it differs from
// the first option ("Type" until something other than "All" is picked) —
// matches the target mockup's Type/Status vs Sort trigger text.
export function RowFilterDropdown({
  label,
  options,
  value,
  onChange,
  showValueWhenDefault = false,
}: {
  label: string
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  showValueWhenDefault?: boolean
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

  const current = options.find((o) => o.value === value)
  const isDefault = options[0]?.value === value
  const triggerText = !isDefault || showValueWhenDefault ? `${label}: ${current?.label ?? ''}` : label

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-itera-control border px-3 py-2 text-sm font-medium',
          isDefault
            ? 'border-itera-border text-itera-ink hover:border-itera-border-strong'
            : 'border-itera-border-strong text-itera-ink-brand',
        )}
      >
        {triggerText}
        <ChevronDown size={14} className="text-itera-muted" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 z-20 mt-1 w-48 rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-itera-ink hover:bg-itera-surface-subtle"
            >
              {option.label}
              {option.value === value && <Check size={14} className="text-itera-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
