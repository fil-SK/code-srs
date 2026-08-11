import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { fieldClass, selectClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { MatchingColumnFormState, MatchingRowFormState } from '@/domain/cardsV2/matchingForm'

// One row: source text plus one cell per "other" column — a <select> when
// that column is fixed (pick the shared option), a free-text <input>
// otherwise. Move up/down are real <button>s (not drag-only) so reordering
// is fully keyboard-operable, and aria-disabled (not native `disabled`) on
// boundary buttons so focus survives repeated moves instead of being
// forcibly blurred by the browser — mirrors OrderingItemRow.tsx. Row order
// is user-visible (it's the order of the term column on MatchingView's
// board), unlike a shared column's option order.
export function MatchingRow({
  row,
  index,
  total,
  columns,
  sourcePlaceholder,
  onSourceChange,
  onCellChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove,
}: {
  row: MatchingRowFormState
  index: number
  total: number
  columns: MatchingColumnFormState[]
  sourcePlaceholder: string
  onSourceChange: (text: string) => void
  onCellChange: (columnId: string, value: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const atTop = index === 0
  const atBottom = index === total - 1

  return (
    <div className="flex items-start gap-2.5 rounded-itera-control border border-itera-border p-2.5">
      <span className="mt-2 flex flex-none items-center gap-1">
        <button
          type="button"
          aria-label={`Move row ${index + 1} up`}
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
          aria-label={`Move row ${index + 1} down`}
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

      <div className="flex flex-1 flex-wrap gap-2">
        <input
          className={cn(fieldClass, 'min-w-[140px] flex-1')}
          value={row.source}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder={sourcePlaceholder}
        />
        {columns.map((col) =>
          col.fixed ? (
            <select
              key={col.id}
              className={cn(selectClass, 'min-w-[140px] flex-1')}
              value={row.cells[col.id] ?? ''}
              onChange={(e) => onCellChange(col.id, e.target.value)}
            >
              <option value="" disabled>
                Choose…
              </option>
              {col.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.text}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={col.id}
              className={cn(fieldClass, 'min-w-[140px] flex-1')}
              value={row.cells[col.id] ?? ''}
              onChange={(e) => onCellChange(col.id, e.target.value)}
              placeholder={col.label ? `${col.label} value` : 'Match'}
            />
          ),
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove row ${index + 1}`}
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
