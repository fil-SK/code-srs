import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import {
  validateMultipleChoiceForm,
  type MultipleChoiceFormState,
} from '@/domain/cards/multipleChoiceForm'
import { MultipleChoiceOptionRow } from './MultipleChoiceOptionRow'

// Mirrors RecallFields.tsx's set(key, value) pattern, with the option-list
// editor (add/remove/reorder/mark-correct) as the centerpiece plus the
// selection-mode and randomize-order controls. No native
// <input type="radio"/checkbox"> anywhere in this file, per spec — every
// toggle is a small custom role="radio"|"checkbox" button styled with itera
// tokens, matching the non-color-reliant indicator introduced into
// MultipleChoiceView.tsx for Review.
export function MultipleChoiceFields({
  form,
  onChange,
}: {
  form: MultipleChoiceFormState
  onChange: (next: MultipleChoiceFormState) => void
}) {
  function set<K extends keyof MultipleChoiceFormState>(key: K, value: MultipleChoiceFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  function updateOption(id: string, patch: Partial<MultipleChoiceFormState['options'][number]>) {
    set(
      'options',
      form.options.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    )
  }

  function toggleCorrect(id: string) {
    if (form.selectionMode === 'multiple') {
      updateOption(id, { correct: !form.options.find((o) => o.id === id)?.correct })
    } else {
      set(
        'options',
        form.options.map((o) => ({ ...o, correct: o.id === id })),
      )
    }
  }

  function addOption() {
    set('options', [...form.options, { id: newId(), text: '', correct: false }])
  }

  function removeOption(id: string) {
    set(
      'options',
      form.options.filter((o) => o.id !== id),
    )
  }

  function moveOption(id: string, direction: -1 | 1) {
    const index = form.options.findIndex((o) => o.id === id)
    const target = index + direction
    if (index === -1 || target < 0 || target >= form.options.length) return
    const next = [...form.options]
    ;[next[index], next[target]] = [next[target], next[index]]
    set('options', next)
  }

  // Structural invariant, not an author omission: single-select cannot have
  // more than one correct option, so switching multiple -> single trims down
  // to the first correct option in list order (mirrors v1 McqEditor's
  // existing setMultiple precedent). The reverse direction is a pure
  // widening and needs no correction.
  function setSelectionMode(mode: 'single' | 'multiple') {
    if (mode === 'single') {
      const firstCorrectIndex = form.options.findIndex((o) => o.correct)
      onChange({
        ...form,
        selectionMode: mode,
        options: form.options.map((o, i) => ({ ...o, correct: i === firstCorrectIndex })),
      })
    } else {
      set('selectionMode', mode)
    }
  }

  const validation = validateMultipleChoiceForm(form)

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="Which of these is true about std::unique_ptr?"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2.5 text-sm text-itera-ink">
          <button
            type="button"
            role="checkbox"
            aria-checked={form.selectionMode === 'multiple'}
            onClick={() =>
              setSelectionMode(form.selectionMode === 'multiple' ? 'single' : 'multiple')
            }
            className={cn(
              'flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors',
              form.selectionMode === 'multiple'
                ? 'border-itera-accent bg-itera-accent'
                : 'border-itera-border-strong bg-itera-surface',
            )}
          >
            {form.selectionMode === 'multiple' && (
              <span className="h-2 w-2 rounded-[1px] bg-white" />
            )}
          </button>
          Allow multiple correct answers
        </label>

        <label className="flex items-center gap-2.5 text-sm text-itera-ink">
          <button
            type="button"
            role="checkbox"
            aria-checked={form.randomizeOptions}
            onClick={() => set('randomizeOptions', !form.randomizeOptions)}
            className={cn(
              'flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors',
              form.randomizeOptions
                ? 'border-itera-accent bg-itera-accent'
                : 'border-itera-border-strong bg-itera-surface',
            )}
          >
            {form.randomizeOptions && <span className="h-2 w-2 rounded-[1px] bg-white" />}
          </button>
          Randomize option order in Review
        </label>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Options (mark the correct one{form.selectionMode === 'multiple' ? 's' : ''})
        </span>
        {form.options.map((opt, i) => (
          <MultipleChoiceOptionRow
            key={opt.id}
            option={opt}
            index={i}
            total={form.options.length}
            selectionMode={form.selectionMode}
            onTextChange={(text) => updateOption(opt.id, { text })}
            onToggleCorrect={() => toggleCorrect(opt.id)}
            onMoveUp={() => moveOption(opt.id, -1)}
            onMoveDown={() => moveOption(opt.id, 1)}
            onRemove={() => removeOption(opt.id)}
            canRemove={form.options.length > 2}
          />
        ))}
        <Button type="button" variant="ghost" onClick={addOption}>
          <Plus size={14} /> Add option
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
            placeholder="Why the correct answer is correct…"
          />
        </Field>
      </div>
    </div>
  )
}
