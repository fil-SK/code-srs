import type { CodeBlock } from '@/types'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { SUPPORTED_LANGUAGES } from './languageList'

// Editor control for a CodeBlock: language picker + a mono textarea. (The review
// view uses CodeView for highlighted display; an editable highlighted editor
// arrives with Code Completion.)
export function CodeBlockField({
  label = 'Code',
  value,
  onChange,
}: {
  label?: string
  value: CodeBlock
  onChange: (value: CodeBlock) => void
}) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        <select
          className={selectClass}
          value={value.language}
          onChange={(e) => onChange({ ...value, language: e.target.value })}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <textarea
          className={cn(fieldClass, 'font-mono')}
          rows={8}
          spellCheck={false}
          value={value.code}
          onChange={(e) => onChange({ ...value, code: e.target.value })}
          placeholder="// paste or write code here"
        />
      </div>
    </Field>
  )
}
