import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

// Same open/outside-click-close idiom as RowFilterDropdown
// (features/library/shared), but the trigger always shows the selected
// option's label verbatim rather than a "label: value" template — matches
// the mockup's "All decks" trigger reading as a plain scope selector, not a
// labeled filter control.
export function DeckScopeDropdown({
  options,
  value,
  onChange,
}: {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
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

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-itera-control border border-itera-border px-3 py-1.5 text-sm font-medium text-itera-ink hover:border-itera-border-strong"
      >
        {current?.label ?? 'All decks'}
        <ChevronDown size={14} className="text-itera-muted" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]"
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
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={14} className="flex-none text-itera-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
