import type { AuthoringPreset } from '@/types/cardV2'
import type { RecallFormState } from '@/domain/cardsV2/recallForm'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

const PRESETS: { value: AuthoringPreset; label: string }[] = [
  { value: 'standard', label: 'Standard question' },
  { value: 'code_reading', label: 'Code reading' },
  { value: 'find_the_bug', label: 'Find the bug' },
  { value: 'predict_output', label: 'Predict output' },
  { value: 'explain_code', label: 'Explain code' },
]

// Spec §8.4: presets are authoring metadata only — they never restructure the
// form or affect scheduling/Review rendering, so switching one just relabels
// the same fields.
export function RecallFields({
  form,
  onChange,
}: {
  form: RecallFormState
  onChange: (next: RecallFormState) => void
}) {
  function set<K extends keyof RecallFormState>(key: K, value: RecallFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-itera-muted">
          Recall presets
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => set('authoringPreset', p.value)}
              className={cn(
                'rounded-itera-control border px-3 py-1.5 text-xs font-medium transition-colors',
                form.authoringPreset === p.value
                  ? 'border-itera-accent bg-itera-surface text-itera-ink-brand shadow-[0_0_0_1px_var(--itera-accent)]'
                  : 'border-itera-border bg-itera-surface-subtle text-itera-ink hover:border-itera-border-strong',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="What is SSA form?"
        />
      </Field>

      <Field label="Answer">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.answer}
          onChange={(e) => set('answer', e.target.value)}
          placeholder="Static Single Assignment: each variable is assigned exactly once."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tip (optional)">
          <textarea
            className={fieldClass}
            rows={2}
            value={form.tip}
            onChange={(e) => set('tip', e.target.value)}
            placeholder="A short hint to help recall the answer…"
          />
        </Field>
        <Field label="Explanation (optional)">
          <textarea
            className={fieldClass}
            rows={2}
            value={form.explanation}
            onChange={(e) => set('explanation', e.target.value)}
            placeholder="Why the answer is correct, or extra context…"
          />
        </Field>
      </div>
    </div>
  )
}
