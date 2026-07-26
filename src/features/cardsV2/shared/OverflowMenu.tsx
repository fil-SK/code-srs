import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface OverflowMenuItem {
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

// A real, functional kebab menu — outside-click-to-close via a ref + document
// listener (the design-preview/library-browser idiom), unlike v1 CardRow's
// `fixed inset-0` backdrop. Two independent ad hoc copies of this pattern
// already existed in the codebase before this one; this is the shared
// primitive both should have been.
export function OverflowMenu({
  items,
  ariaLabel = 'Card actions',
}: {
  items: OverflowMenuItem[]
  ariaLabel?: string
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
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className="grid h-8 w-8 place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-44 rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setOpen(false)
                onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                danger
                  ? 'text-itera-error hover:bg-itera-error-soft'
                  : 'text-itera-ink hover:bg-itera-surface-subtle',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
