import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import { SUPPORTED_LANGUAGES } from '@/components/code/languageList'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import { validateWriteCodeForm, type WriteCodeFormState } from '@/domain/cardsV2/writeCodeForm'
import { WriteCodeAnswerRow } from './WriteCodeAnswerRow'

const COMPARISON_TOGGLES: {
  key: keyof WriteCodeFormState['comparison']
  label: string
}[] = [
  { key: 'trimOuterWhitespace', label: 'Trim outer whitespace' },
  { key: 'normalizeLineEndings', label: 'Normalize line endings' },
  { key: 'ignoreTrailingWhitespace', label: 'Ignore trailing whitespace per line' },
  { key: 'caseSensitive', label: 'Case-sensitive comparison' },
]

// Mirrors MultipleChoiceFields.tsx's set(key, value) pattern. The accepted-
// answers list (add/remove/reorder) is the centerpiece, same shape as
// MultipleChoiceFields' option list; comparison settings are kept visually
// secondary inside a collapsed <details> disclosure, per spec. No native
// <input type="checkbox"> anywhere here, matching Multiple Choice's
// established custom role="checkbox" convention.
export function WriteCodeFields({
  form,
  onChange,
}: {
  form: WriteCodeFormState
  onChange: (next: WriteCodeFormState) => void
}) {
  function set<K extends keyof WriteCodeFormState>(key: K, value: WriteCodeFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  function setComparison(key: keyof WriteCodeFormState['comparison'], value: boolean) {
    onChange({ ...form, comparison: { ...form.comparison, [key]: value } })
  }

  function updateAnswerCode(id: string, code: string) {
    set(
      'acceptedAnswers',
      form.acceptedAnswers.map((a) => (a.id === id ? { ...a, code } : a)),
    )
  }

  function addAnswer() {
    set('acceptedAnswers', [...form.acceptedAnswers, { id: newId(), code: '' }])
  }

  function removeAnswer(id: string) {
    set(
      'acceptedAnswers',
      form.acceptedAnswers.filter((a) => a.id !== id),
    )
  }

  function moveAnswer(id: string, direction: -1 | 1) {
    const index = form.acceptedAnswers.findIndex((a) => a.id === id)
    const target = index + direction
    if (index === -1 || target < 0 || target >= form.acceptedAnswers.length) return
    const next = [...form.acceptedAnswers]
    ;[next[index], next[target]] = [next[target], next[index]]
    set('acceptedAnswers', next)
  }

  const validation = validateWriteCodeForm(form)

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="Write a function that returns the sum of all elements in v."
        />
      </Field>

      <Field label="Language">
        <select
          className={selectClass}
          value={form.language}
          onChange={(e) => set('language', e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-1.5">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Starter code (optional)
        </span>
        <LazyCodeEditor
          value={form.starterCode}
          language={form.language}
          onChange={(value) => set('starterCode', value)}
        />
        <p className="text-xs text-itera-muted">
          The full starter code above is editable during Review — per-line
          editable/read-only regions aren&apos;t supported yet.
        </p>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Accepted answers
        </span>
        {form.acceptedAnswers.map((answer, i) => (
          <WriteCodeAnswerRow
            key={answer.id}
            answer={answer}
            index={i}
            total={form.acceptedAnswers.length}
            language={form.language}
            onCodeChange={(code) => updateAnswerCode(answer.id, code)}
            onMoveUp={() => moveAnswer(answer.id, -1)}
            onMoveDown={() => moveAnswer(answer.id, 1)}
            onRemove={() => removeAnswer(answer.id)}
            canRemove={form.acceptedAnswers.length > 1}
          />
        ))}
        <Button type="button" variant="ghost" onClick={addAnswer}>
          <Plus size={14} /> Add accepted answer
        </Button>
      </div>

      {validation.errors.length > 0 && (
        <ul className="space-y-1 text-xs font-medium text-itera-error">
          {validation.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <details className="rounded-itera-card border border-itera-border bg-itera-surface px-3.5 py-2.5">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Advanced comparison settings
        </summary>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {COMPARISON_TOGGLES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 text-sm text-itera-ink">
              <button
                type="button"
                role="checkbox"
                aria-checked={form.comparison[key]}
                onClick={() => setComparison(key, !form.comparison[key])}
                className={cn(
                  'flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors',
                  form.comparison[key]
                    ? 'border-itera-accent bg-itera-accent'
                    : 'border-itera-border-strong bg-itera-surface',
                )}
              >
                {form.comparison[key] && <span className="h-2 w-2 rounded-[1px] bg-white" />}
              </button>
              {label}
            </label>
          ))}
        </div>
      </details>

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
            placeholder="Why this solution works…"
          />
        </Field>
      </div>
    </div>
  )
}
