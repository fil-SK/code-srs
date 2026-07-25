import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { InlineText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'

// Keyboard reordering deliberately does not go through dnd-kit's
// KeyboardSensor: that sensor needs the row itself to be a keyboard-operable
// drag handle (Space to pick up, arrows to move, Space to drop), which would
// make the row a non-button focus target that intercepts Space - directly
// colliding with the Review shell's global Space handler. Explicit Move
// up/down buttons sidestep that entirely (real <button>s are excluded from
// the shell's shortcut guard) and are the only reordering path required to
// work; drag (mouse/touch, via PointerSensor in OrderingView) is additive.
//
// Boundary buttons use aria-disabled + pointer-events-none rather than the
// native `disabled` attribute: a browser forcibly blurs a focused element
// when it becomes natively disabled, which would eject focus from the row
// the moment an item reaches the top or bottom - the opposite of "keep focus
// on the moved item." aria-disabled keeps the button focusable and inert.
export function OrderingRow({
  id,
  index,
  total,
  content,
  locked,
  showFeedback,
  correct,
  expectedIndex,
  onMoveUp,
  onMoveDown,
}: {
  id: string
  index: number
  total: number
  content: string
  locked: boolean
  showFeedback: boolean
  correct: boolean
  expectedIndex: number
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const { setNodeRef, transform, transition, isDragging, listeners } = useSortable({
    id,
    disabled: locked,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const atTop = index === 0
  const atBottom = index === total - 1

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-itera-control border bg-itera-surface px-3 py-2.5 text-sm',
        showFeedback
          ? cn('border-itera-border border-l-4', correct ? 'border-l-itera-success' : 'border-l-itera-error')
          : 'border-itera-border',
        isDragging && 'opacity-80 shadow-lg ring-1 ring-itera-accent',
      )}
    >
      {!locked && (
        <span
          {...listeners}
          aria-hidden="true"
          tabIndex={-1}
          className="flex-none cursor-grab touch-none text-itera-muted"
        >
          <GripVertical size={16} />
        </span>
      )}
      <span className="w-5 flex-none font-mono text-xs text-itera-muted">{index + 1}.</span>
      <span className="flex-1 text-itera-ink">
        <InlineText text={content} />
      </span>

      {showFeedback ? (
        correct ? (
          <span className="flex flex-none items-center gap-1 text-xs font-medium text-itera-success">
            <Check size={14} />
            Correct
          </span>
        ) : (
          <span className="flex flex-none items-center gap-1 text-xs font-medium text-itera-error">
            <X size={14} />
            Belongs at #{expectedIndex + 1}
          </span>
        )
      ) : (
        <span className="flex flex-none items-center gap-1">
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
      )}
    </li>
  )
}
