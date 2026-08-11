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
// The mockup's resting row shows only the label and a grip, so the Move
// up/down buttons are faded out (opacity, never `hidden`/`invisible`) until
// the row is hovered or holds focus. They stay in the DOM, in tab order, and
// hit-testable the whole time - group-focus-within is what makes them visible
// the moment a keyboard reaches them.
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

  const moveButtonClass = (disabled: boolean) =>
    cn(
      'rounded-itera-control p-1 text-itera-muted-light opacity-0 transition hover:text-itera-ink',
      'group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
      // A boundary control stays faded even while revealed, but it must not
      // be the one thing visible on an otherwise resting row - so it fades
      // to 30%, not from 0 to 30%.
      disabled && 'pointer-events-none group-hover:opacity-30 group-focus-within:opacity-30',
    )

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-itera-card border bg-itera-surface px-5 py-4 text-[0.95rem] shadow-[0_1px_2px_rgba(23,32,51,0.05)]',
        // Graded rows tint the whole border and fill rather than carrying a
        // thick left edge: at the row's card radius that edge renders as a
        // crescent. Color is never the only signal - every row also states
        // "Correct" or "Belongs at #N" in text.
        showFeedback
          ? correct
            ? 'border-itera-success/40 bg-itera-success-soft'
            : 'border-itera-error/40 bg-itera-error-soft'
          : 'border-itera-border',
        isDragging && 'opacity-80 shadow-lg ring-1 ring-itera-accent',
      )}
    >
      {/* The position number is redundant on the front (the order is already
          visible, and the mockup's rows carry no numbering), but on the
          feedback face it is what makes "Belongs at #3" readable against the
          row it sits on. Kept a sibling of the label, never wrapped around
          it, so the row's visible text stays exactly the item's own. */}
      {showFeedback && (
        <span className="w-5 flex-none font-mono text-xs text-itera-muted">{index + 1}.</span>
      )}
      <span className="flex-1 leading-snug text-itera-ink">
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
        <>
          <span className="flex flex-none items-center">
            <button
              type="button"
              aria-label={`Move item ${index + 1} up`}
              aria-disabled={atTop}
              onClick={onMoveUp}
              className={moveButtonClass(atTop)}
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              aria-label={`Move item ${index + 1} down`}
              aria-disabled={atBottom}
              onClick={onMoveDown}
              className={moveButtonClass(atBottom)}
            >
              <ChevronDown size={16} />
            </button>
          </span>

          {!locked && (
            <span
              {...listeners}
              aria-hidden="true"
              tabIndex={-1}
              className="ml-1 flex-none cursor-grab touch-none text-itera-muted-light"
            >
              <GripVertical size={18} />
            </span>
          )}
        </>
      )}
    </li>
  )
}
