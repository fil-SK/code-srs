import { Plus, X } from 'lucide-react'
import type { McqContent } from '@/types'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { EditorProps } from '../../registry/types'

export function McqEditor({ content, onChange }: EditorProps<'mcq'>) {
  function update(patch: Partial<McqContent>) {
    onChange({ ...content, ...patch })
  }

  function setOptionText(id: string, text: string) {
    update({
      options: content.options.map((o) => (o.id === id ? { ...o, text } : o)),
    })
  }

  function toggleCorrect(id: string) {
    if (content.multiple) {
      update({
        correct: content.correct.includes(id)
          ? content.correct.filter((x) => x !== id)
          : [...content.correct, id],
      })
    } else {
      update({ correct: [id] })
    }
  }

  function addOption() {
    update({ options: [...content.options, { id: newId(), text: '' }] })
  }

  function removeOption(id: string) {
    update({
      options: content.options.filter((o) => o.id !== id),
      correct: content.correct.filter((x) => x !== id),
    })
  }

  function setMultiple(multiple: boolean) {
    update({ multiple, correct: multiple ? content.correct : content.correct.slice(0, 1) })
  }

  return (
    <>
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={2}
          value={content.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder="Which of these is true about std::unique_ptr?"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={content.multiple}
          onChange={(e) => setMultiple(e.target.checked)}
        />
        Allow multiple correct answers
      </label>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Options (mark the correct one{content.multiple ? 's' : ''})
        </span>
        {content.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2.5">
            <input
              type={content.multiple ? 'checkbox' : 'radio'}
              checked={content.correct.includes(opt.id)}
              onChange={() => toggleCorrect(opt.id)}
              aria-label="Mark correct"
            />
            <input
              className={fieldClass}
              value={opt.text}
              onChange={(e) => setOptionText(opt.id, e.target.value)}
              placeholder="Option text"
            />
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              disabled={content.options.length <= 2}
              className={cn(
                'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-border text-muted',
                content.options.length <= 2
                  ? 'opacity-40'
                  : 'hover:border-red hover:text-red',
              )}
              aria-label="Remove option"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <Button variant="ghost" onClick={addOption}>
          <Plus size={14} /> Add option
        </Button>
      </div>

      <Field label="Explanation (optional)">
        <textarea
          className={fieldClass}
          rows={3}
          value={content.explanation ?? ''}
          onChange={(e) => update({ explanation: e.target.value })}
          placeholder="Why the correct answer is correct…"
        />
      </Field>
    </>
  )
}
