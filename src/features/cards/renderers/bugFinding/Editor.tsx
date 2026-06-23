import { CodeBlockField } from '@/components/code/CodeBlockField'
import { Field, fieldClass } from '@/components/ui/Field'
import type { EditorProps } from '../../registry/types'

export function BugFindingEditor({
  content,
  onChange,
}: EditorProps<'bugFinding'>) {
  return (
    <>
      <Field label="Prompt (optional, defaults to “Find the bug”)">
        <input
          className={fieldClass}
          value={content.question ?? ''}
          onChange={(e) => onChange({ ...content, question: e.target.value })}
          placeholder="What is wrong with this loop?"
        />
      </Field>
      <CodeBlockField
        value={content.code}
        onChange={(code) => onChange({ ...content, code })}
      />
      <Field label="Hint (optional)">
        <input
          className={fieldClass}
          value={content.bugHint ?? ''}
          onChange={(e) => onChange({ ...content, bugHint: e.target.value })}
          placeholder="Look at the loop bound."
        />
      </Field>
      <Field label="Explanation">
        <textarea
          className={fieldClass}
          rows={4}
          value={content.explanation}
          onChange={(e) => onChange({ ...content, explanation: e.target.value })}
          placeholder="The loop runs one element past the end because <= should be <…"
        />
      </Field>
    </>
  )
}
