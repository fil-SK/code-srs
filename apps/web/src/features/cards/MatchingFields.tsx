import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import {
  MAX_MATCHING_VALUE_COLUMNS,
  addMatchingColumn,
  addMatchingOption,
  addMatchingRow,
  moveMatchingRow,
  removeMatchingColumn,
  removeMatchingOption,
  removeMatchingRow,
  renameMatchingOption,
  setColumnFixed,
  updateMatchingColumnLabel,
  updateMatchingRowCell,
  updateMatchingRowSource,
  validateMatchingForm,
  type MatchingFormState,
} from '@/domain/cards/matchingForm'
import { MatchingColumnEditor } from './MatchingColumnEditor'
import { MatchingRow } from './MatchingRow'

// The centerpiece is two lists — "other" columns (add/remove up to
// MAX_MATCHING_VALUE_COLUMNS, each with an optional fixed-value-list
// sub-editor) and rows (add/remove/reorder) — plus the shared
// Prompt/source-label/Tip/Explanation fields. Column reordering is out of
// scope (add/remove only); row order is kept because it's genuinely
// user-visible (the term column's order on MatchingView's board), unlike a
// fixed column's option order. Mirrors OrderingFields.tsx's
// set(key, value) + pure-helper-from-domain-module composition, except the
// mutation helpers themselves live in matchingForm.ts (not local closures)
// so their cascade-cleanup invariants (dangling column/option references)
// stay directly unit-testable.
export function MatchingFields({
  form,
  onChange,
}: {
  form: MatchingFormState
  onChange: (next: MatchingFormState) => void
}) {
  function set<K extends keyof MatchingFormState>(key: K, value: MatchingFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  const validation = validateMatchingForm(form)
  const sourcePlaceholder = form.sourceLabel.trim() || 'Term'

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="Match each term to its definition."
        />
      </Field>

      <Field label="Source column label (optional)">
        <input
          className={fieldClass}
          value={form.sourceLabel}
          onChange={(e) => set('sourceLabel', e.target.value)}
          placeholder="e.g. Term, Concept, Word"
        />
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Columns to match against
        </span>
        {form.columns.map((column) => (
          <MatchingColumnEditor
            key={column.id}
            column={column}
            canRemove={form.columns.length > 1}
            onLabelChange={(label) => onChange(updateMatchingColumnLabel(form, column.id, label))}
            onToggleFixed={(fixed) => onChange(setColumnFixed(form, column.id, fixed))}
            onRemove={() => onChange(removeMatchingColumn(form, column.id))}
            onAddOption={() => onChange(addMatchingOption(form, column.id))}
            onOptionTextChange={(optionId, text) =>
              onChange(renameMatchingOption(form, column.id, optionId, text))
            }
            onRemoveOption={(optionId) =>
              onChange(removeMatchingOption(form, column.id, optionId))
            }
          />
        ))}
        {form.columns.length < MAX_MATCHING_VALUE_COLUMNS ? (
          <Button type="button" variant="ghost" onClick={() => onChange(addMatchingColumn(form))}>
            <Plus size={14} /> Add column
          </Button>
        ) : (
          <p className="text-xs text-itera-muted">
            A Matching card holds at most {MAX_MATCHING_VALUE_COLUMNS + 1} columns.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Rows (relationships)
        </span>
        {form.rows.map((row, i) => (
          <MatchingRow
            key={row.id}
            row={row}
            index={i}
            total={form.rows.length}
            columns={form.columns}
            sourcePlaceholder={sourcePlaceholder}
            onSourceChange={(text) => onChange(updateMatchingRowSource(form, row.id, text))}
            onCellChange={(columnId, value) =>
              onChange(updateMatchingRowCell(form, row.id, columnId, value))
            }
            onMoveUp={() => onChange(moveMatchingRow(form, row.id, -1))}
            onMoveDown={() => onChange(moveMatchingRow(form, row.id, 1))}
            onRemove={() => onChange(removeMatchingRow(form, row.id))}
            canRemove={form.rows.length > 2}
          />
        ))}
        <Button type="button" variant="ghost" onClick={() => onChange(addMatchingRow(form))}>
          <Plus size={14} /> Add row
        </Button>
      </div>

      {validation.errors.length > 0 && (
        <ul className="space-y-1 text-xs font-medium text-itera-error">
          {validation.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tip (optional)">
          <textarea
            className={fieldClass}
            rows={2}
            value={form.tip}
            onChange={(e) => set('tip', e.target.value)}
            placeholder="A short hint to help narrow it down…"
          />
        </Field>
        <Field label="Explanation (optional)">
          <textarea
            className={fieldClass}
            rows={2}
            value={form.explanation}
            onChange={(e) => set('explanation', e.target.value)}
            placeholder="Why these pairs go together…"
          />
        </Field>
      </div>
    </div>
  )
}
