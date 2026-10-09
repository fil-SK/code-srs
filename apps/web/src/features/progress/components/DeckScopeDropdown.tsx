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
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        ref.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const current = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex min-h-8 max-w-full items-center gap-1.5 whitespace-nowrap rounded-fliptap-control border border-fliptap-border px-3 py-1.5 text-xs font-medium text-fliptap-ink hover:border-fliptap-border-strong"
      >
        <span className="max-w-28 truncate">{current?.label ?? 'All decks'}</span>
        <ChevronDown size={14} className="text-fliptap-muted" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 max-h-64 w-56 max-w-[calc(100vw-32px)] overflow-y-auto rounded-fliptap-control border border-fliptap-border bg-fliptap-surface py-1 shadow-[var(--fliptap-shadow-float)]"
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
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-fliptap-ink hover:bg-fliptap-surface-subtle"
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={14} className="flex-none text-fliptap-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
