import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { MatchingColumnFormState } from '@/domain/cardsV2/matchingForm'
import { MatchingOptionRow } from './MatchingOptionRow'

// One "other" column's header: label, a fixed-list toggle (shares one value
// list across every row, graded by value equality — e.g. Yes/No), and,
// when fixed, its option list. No native <input type="checkbox"> per spec —
// the toggle is a small custom role="checkbox" button, matching
// OrderingFields.tsx/MultipleChoiceFields.tsx's convention.
export function MatchingColumnEditor({
  column,
  canRemove,
  onLabelChange,
  onToggleFixed,
  onRemove,
  onAddOption,
  onOptionTextChange,
  onRemoveOption,
}: {
  column: MatchingColumnFormState
  canRemove: boolean
  onLabelChange: (label: string) => void
  onToggleFixed: (fixed: boolean) => void
  onRemove: () => void
  onAddOption: () => void
  onOptionTextChange: (optionId: string, text: string) => void
  onRemoveOption: (optionId: string) => void
}) {
  return (
    <div className="space-y-3 rounded-itera-control border border-itera-border p-3">
      <div className="flex items-center gap-2.5">
        <input
          className={fieldClass}
          value={column.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Column label (e.g. Definition)"
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove column"
          className={cn(
            'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-itera-border text-itera-muted',
            canRemove ? 'hover:border-itera-error hover:text-itera-error' : 'opacity-40',
          )}
        >
          <X size={15} />
        </button>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-itera-ink">
        <button
          type="button"
          role="checkbox"
          aria-checked={column.fixed}
          onClick={() => onToggleFixed(!column.fixed)}
          className={cn(
            'flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors',
            column.fixed
              ? 'border-itera-accent bg-itera-accent'
              : 'border-itera-border-strong bg-itera-surface',
          )}
        >
          {column.fixed && <span className="h-2 w-2 rounded-[1px] bg-white" />}
        </button>
        Pick from a fixed list (shared across rows)
      </label>

      {column.fixed && (
        <div className="space-y-2 border-t border-dashed border-itera-border pt-3">
          {column.options.map((option) => (
            <MatchingOptionRow
              key={option.id}
              option={option}
              onTextChange={(text) => onOptionTextChange(option.id, text)}
              onRemove={() => onRemoveOption(option.id)}
              canRemove={column.options.length > 2}
            />
          ))}
          <Button type="button" variant="ghost" onClick={onAddOption}>
            <Plus size={14} /> Add option
          </Button>
        </div>
      )}
    </div>
  )
}
