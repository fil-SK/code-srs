import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, FolderInput, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'

// Simple local-state kebab menu. Rename/Move/Delete are visually present but
// inert (no-op) — Create/Edit is out of scope for this preview.
export function OverflowMenu() {
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
        aria-label="Deck actions"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="grid h-8 w-8 place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-40 rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: 'Rename', icon: Pencil },
            { label: 'Move', icon: FolderInput },
            { label: 'Delete', icon: Trash2, danger: true },
          ].map(({ label, icon: Icon, danger }) => (
            <button
              key={label}
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                danger ? 'text-itera-error hover:bg-itera-error-soft' : 'text-itera-ink hover:bg-itera-surface-subtle',
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
