import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import { validateOrderingForm, type OrderingFormState } from '@/domain/cards/orderingForm'
import { OrderingItemRow } from './OrderingItemRow'

// Mirrors MultipleChoiceFields.tsx's set(key, value) pattern, with the
// item-list editor (add/remove/reorder) as the centerpiece plus the
// randomize-order control. No native <input type="checkbox"> anywhere in this
// file, per spec — the toggle is a small custom role="checkbox" button styled
// with itera tokens. Item order in the list IS the correct order — there is
// no per-item "mark correct" control the way Multiple Choice has one.
export function OrderingFields({
  form,
  onChange,
}: {
  form: OrderingFormState
  onChange: (next: OrderingFormState) => void
}) {
  function set<K extends keyof OrderingFormState>(key: K, value: OrderingFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  function updateItem(id: string, text: string) {
    set(
      'items',
      form.items.map((i) => (i.id === id ? { ...i, text } : i)),
    )
  }

  function addItem() {
    set('items', [...form.items, { id: newId(), text: '' }])
  }

  function removeItem(id: string) {
    set(
      'items',
      form.items.filter((i) => i.id !== id),
    )
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = form.items.findIndex((i) => i.id === id)
    const target = index + direction
    if (index === -1 || target < 0 || target >= form.items.length) return
    const next = [...form.items]
    ;[next[index], next[target]] = [next[target], next[index]]
    set('items', next)
  }

  const validation = validateOrderingForm(form)

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="Put these steps in the correct order."
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm text-itera-ink">
        <button
          type="button"
          role="checkbox"
          aria-checked={form.randomize}
          onClick={() => set('randomize', !form.randomize)}
          className={cn(
            'flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors',
            form.randomize
              ? 'border-itera-accent bg-itera-accent'
              : 'border-itera-border-strong bg-itera-surface',
          )}
        >
          {form.randomize && <span className="h-2 w-2 rounded-[1px] bg-white" />}
        </button>
        Randomize order in Review
      </label>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Items (in the correct order)
        </span>
        {form.items.map((item, i) => (
          <OrderingItemRow
            key={item.id}
            item={item}
            index={i}
            total={form.items.length}
            onTextChange={(text) => updateItem(item.id, text)}
            onMoveUp={() => moveItem(item.id, -1)}
            onMoveDown={() => moveItem(item.id, 1)}
            onRemove={() => removeItem(item.id)}
            canRemove={form.items.length > 2}
          />
        ))}
        <Button type="button" variant="ghost" onClick={addItem}>
          <Plus size={14} /> Add item
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
            placeholder="Why this order is correct…"
          />
        </Field>
      </div>
    </div>
  )
}
