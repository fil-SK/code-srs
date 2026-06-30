import { Field, fieldClass } from '@/components/ui/Field'
import type { EditorProps } from '../../registry/types'
import { ExplanationField } from '../Explanation'

export function BasicEditor({ content, onChange }: EditorProps<'basic'>) {
  return (
    <>
      <Field label="Front (question)">
        <textarea
          className={fieldClass}
          rows={3}
          value={content.front}
          onChange={(e) => onChange({ ...content, front: e.target.value })}
          placeholder="What is SSA form?"
        />
      </Field>
      <Field label="Back (answer)">
        <textarea
          className={fieldClass}
          rows={5}
          value={content.back}
          onChange={(e) => onChange({ ...content, back: e.target.value })}
          placeholder="Static Single Assignment: each variable is assigned exactly once…"
        />
      </Field>
      <ExplanationField
        value={content.explanation}
        onChange={(explanation) => onChange({ ...content, explanation })}
      />
    </>
  )
}
