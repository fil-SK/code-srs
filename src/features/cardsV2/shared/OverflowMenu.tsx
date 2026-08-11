import { useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FloatingPanel } from '@/components/ui/FloatingPanel'

export interface OverflowMenuItem {
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

// A real, functional kebab menu. The panel is portaled and positioned against
// the trigger by FloatingPanel rather than being an `absolute` child: inside
// the Library tables an in-flow panel got clipped by the surrounding
// `overflow-x-auto` box (see FloatingPanel for the full why) and rows near the
// bottom of the list could only be reached by scrolling the table.
export function OverflowMenu({
  items,
  ariaLabel = 'Card actions',
  bordered = false,
}: {
  items: OverflowMenuItem[]
  ariaLabel?: string
  bordered?: boolean
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink',
          bordered && 'h-10 w-10 border border-itera-border hover:border-itera-border-strong',
        )}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <FloatingPanel
          anchor={buttonRef.current}
          onClose={() => setOpen(false)}
          role="menu"
          ariaLabel={ariaLabel}
          className="w-44"
        >
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
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
        </FloatingPanel>
      )}
    </div>
  )
}
