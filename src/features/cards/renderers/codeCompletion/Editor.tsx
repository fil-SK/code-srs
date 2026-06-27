import { Plus, X } from 'lucide-react'
import type { CodeCompletionContent } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { CodeBlockField } from '@/components/code/CodeBlockField'
import { cn } from '@/lib/cn'
import type { EditorProps } from '../../registry/types'

export function CodeCompletionEditor({
  content,
  onChange,
}: EditorProps<'codeCompletion'>) {
  function update(patch: Partial<CodeCompletionContent>) {
    onChange({ ...content, ...patch })
  }

  function setSolution(index: number, value: string) {
    update({
      solutions: content.solutions.map((s, i) => (i === index ? value : s)),
    })
  }

  const auto = content.validation.mode === 'normalizedMatch'

  return (
    <>
      <Field label="Question / prompt (optional)">
        <textarea
          className={fieldClass}
          rows={2}
          value={content.prompt ?? ''}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder="e.g. How do you reverse a list in Python?"
        />
      </Field>

      <CodeBlockField
        label="Scaffold (optional — leave empty for a plain question)"
        value={content.scaffold}
        onChange={(scaffold) => update({ scaffold })}
      />

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Accepted solutions
        </span>
        {content.solutions.map((sol, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <textarea
              className={cn(fieldClass, 'font-mono')}
              rows={2}
              value={sol}
              onChange={(e) => setSolution(idx, e.target.value)}
              placeholder="return a + b;"
            />
            <button
              type="button"
              onClick={() =>
                update({
                  solutions: content.solutions.filter((_, i) => i !== idx),
                })
              }
              disabled={content.solutions.length <= 1}
              className={cn(
                'mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-border text-muted',
                content.solutions.length <= 1
                  ? 'opacity-40'
                  : 'hover:border-red hover:text-red',
              )}
              aria-label="Remove solution"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() => update({ solutions: [...content.solutions, ''] })}
        >
          <Plus size={14} /> Add accepted answer
        </Button>
      </div>

      <Field label="Validation">
        <select
          className={selectClass}
          value={content.validation.mode}
          onChange={(e) =>
            update({
              validation: {
                ...content.validation,
                mode: e.target.value as CodeCompletionContent['validation']['mode'],
              },
            })
          }
        >
          <option value="normalizedMatch">Auto-check (normalized match)</option>
          <option value="none">Manual grading only</option>
        </select>
      </Field>

      {auto && (
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={content.validation.ignoreWhitespace}
              onChange={(e) =>
                update({
                  validation: {
                    ...content.validation,
                    ignoreWhitespace: e.target.checked,
                  },
                })
              }
            />
            Ignore whitespace
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={content.validation.caseSensitive}
              onChange={(e) =>
                update({
                  validation: {
                    ...content.validation,
                    caseSensitive: e.target.checked,
                  },
                })
              }
            />
            Case-sensitive
          </label>
        </div>
      )}

      <Field label="Explanation (optional)">
        <textarea
          className={fieldClass}
          rows={3}
          value={content.explanation ?? ''}
          onChange={(e) => update({ explanation: e.target.value })}
          placeholder="Why this completes the snippet…"
        />
      </Field>
    </>
  )
}
