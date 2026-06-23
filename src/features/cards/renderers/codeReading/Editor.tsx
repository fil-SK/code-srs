import { CodeBlockField } from '@/components/code/CodeBlockField'
import { Field, fieldClass } from '@/components/ui/Field'
import type { EditorProps } from '../../registry/types'

export function CodeReadingEditor({
  content,
  onChange,
}: EditorProps<'codeReading'>) {
  return (
    <>
      <CodeBlockField
        value={content.code}
        onChange={(code) => onChange({ ...content, code })}
      />
      <Field label="Question">
        <textarea
          className={fieldClass}
          rows={2}
          value={content.question}
          onChange={(e) => onChange({ ...content, question: e.target.value })}
          placeholder="What does arith.addi require of its operands?"
        />
      </Field>
      <Field label="Answer">
        <textarea
          className={fieldClass}
          rows={4}
          value={content.answer}
          onChange={(e) => onChange({ ...content, answer: e.target.value })}
          placeholder="Both operands and the result must share the same integer type…"
        />
      </Field>
    </>
  )
}
