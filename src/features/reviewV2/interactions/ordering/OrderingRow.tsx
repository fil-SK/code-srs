import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, X } from 'lucide-react'
import { InlineText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'

// The whole unlocked row is both the pointer drag target and the keyboard
// drag target. dnd-kit's attributes give it button semantics and a tab stop;
// the Review shell already excludes role="button" targets from its global
// Space/Enter shortcuts, so Space can safely pick up/drop and Arrow keys can
// reorder without accidentally submitting the card.
const GRIP_DOTS = Array.from({ length: 12 })

export function OrderingRow({
  id,
  index,
  content,
  locked,
  showFeedback,
  correct,
  expectedIndex,
}: {
  id: string
  index: number
  content: string
  locked: boolean
  showFeedback: boolean
  correct: boolean
  expectedIndex: number
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id,
    disabled: locked,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      {...(!locked ? attributes : undefined)}
      {...(!locked ? listeners : undefined)}
      style={style}
      data-ordering-row=""
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
        !locked && 'cursor-grab touch-none active:cursor-grabbing',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg ring-1 ring-itera-accent',
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
        !locked && (
          <span
            data-ordering-grip=""
            aria-hidden="true"
            className="pointer-events-none ml-1 grid flex-none grid-cols-3 gap-[3px] text-itera-muted-light"
          >
            {GRIP_DOTS.map((_, dot) => (
              <span
                key={dot}
                data-ordering-grip-dot=""
                className="size-[3px] rounded-full bg-current"
              />
            ))}
          </span>
        )
      )}
    </li>
  )
}
