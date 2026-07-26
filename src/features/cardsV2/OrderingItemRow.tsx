import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { OrderingItemFormState } from '@/domain/cardsV2/orderingForm'

// One editable item row in the Ordering editor's item list. Mirrors
// MultipleChoiceOptionRow.tsx minus the correct-toggle button — the list's
// own order IS the correct order here, so there's nothing to mark. Move
// up/down are real <button>s (not drag-only) so reordering is fully
// keyboard-operable, and aria-disabled (not native `disabled`) on boundary
// buttons so focus survives repeated moves instead of being forcibly blurred
// by the browser.
export function OrderingItemRow({
  item,
  index,
  total,
  onTextChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove,
}: {
  item: OrderingItemFormState
  index: number
  total: number
  onTextChange: (text: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const atTop = index === 0
  const atBottom = index === total - 1

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-2 w-5 flex-none font-mono text-xs text-itera-muted">{index + 1}.</span>

      <textarea
        className={cn(fieldClass, 'resize-none')}
        rows={2}
        value={item.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Step or item text…"
      />

      <span className="mt-1 flex flex-none items-center gap-1">
        <button
          type="button"
          aria-label={`Move item ${index + 1} up`}
          aria-disabled={atTop}
          onClick={onMoveUp}
          className={cn(
            'rounded-itera-control p-1 text-itera-muted hover:text-itera-ink',
            atTop && 'pointer-events-none opacity-30',
          )}
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          aria-label={`Move item ${index + 1} down`}
          aria-disabled={atBottom}
          onClick={onMoveDown}
          className={cn(
            'rounded-itera-control p-1 text-itera-muted hover:text-itera-ink',
            atBottom && 'pointer-events-none opacity-30',
          )}
        >
          <ChevronDown size={16} />
        </button>
      </span>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove item ${index + 1}`}
        className={cn(
          'mt-1 grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-itera-border text-itera-muted',
          canRemove ? 'hover:border-itera-error hover:text-itera-error' : 'opacity-40',
        )}
      >
        <X size={15} />
      </button>
    </div>
  )
}
