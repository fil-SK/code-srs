import { Check, ChevronDown, ChevronUp, X } from 'lucide-react'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { McOptionFormState } from '@/domain/cardsV2/multipleChoiceForm'

// One editable option row in the Multiple Choice editor's option list.
// Move up/down are cloned from reviewV2's OrderingRow.tsx idiom: real
// <button>s (not drag-only) so reordering is fully keyboard-operable, and
// aria-disabled (not native `disabled`) on boundary buttons so focus survives
// repeated moves instead of being forcibly blurred by the browser.
export function MultipleChoiceOptionRow({
  option,
  index,
  total,
  selectionMode,
  onTextChange,
  onToggleCorrect,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove,
}: {
  option: McOptionFormState
  index: number
  total: number
  selectionMode: 'single' | 'multiple'
  onTextChange: (text: string) => void
  onToggleCorrect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const atTop = index === 0
  const atBottom = index === total - 1

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role={selectionMode === 'multiple' ? 'checkbox' : 'radio'}
        aria-checked={option.correct}
        aria-label={`Mark option ${index + 1} correct`}
        onClick={onToggleCorrect}
        className={cn(
          'flex h-6 w-6 flex-none items-center justify-center border transition-colors',
          selectionMode === 'multiple' ? 'rounded-[6px]' : 'rounded-full',
          option.correct
            ? 'border-itera-accent bg-itera-accent text-white'
            : 'border-itera-border-strong bg-itera-surface text-transparent hover:border-itera-accent',
        )}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <input
        className={fieldClass}
        value={option.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Option text"
      />

      <span className="flex flex-none items-center gap-1">
        <button
          type="button"
          aria-label={`Move option ${index + 1} up`}
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
          aria-label={`Move option ${index + 1} down`}
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
        aria-label={`Remove option ${index + 1}`}
        className={cn(
          'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-itera-border text-itera-muted',
          canRemove ? 'hover:border-itera-error hover:text-itera-error' : 'opacity-40',
        )}
      >
        <X size={15} />
      </button>
    </div>
  )
}
