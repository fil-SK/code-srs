import { X } from 'lucide-react'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { MatchingOptionFormState } from '@/domain/cardsV2/matchingForm'

// One option in a fixed column's shared value list (e.g. "Yes"/"No"). No
// reorder controls — option order has no observable effect in Review (each
// row picks by id, not position), unlike row order in MatchingRow.tsx.
export function MatchingOptionRow({
  option,
  onTextChange,
  onRemove,
  canRemove,
}: {
  option: MatchingOptionFormState
  onTextChange: (text: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        className={fieldClass}
        value={option.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Option value (e.g. Yes)"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove option"
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
