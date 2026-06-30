import { RichText } from '@/components/text/RichText'
import { Field, fieldClass } from '@/components/ui/Field'

// Editor input for a card's optional explanation. Supports markdown like the
// other prose fields.
export function ExplanationField({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <Field label="Explanation (optional)">
      <textarea
        className={fieldClass}
        rows={3}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Why this is the answer…"
      />
    </Field>
  )
}

// Reveal-time block showing the explanation, rendered only when set.
export function ExplanationView({ text }: { text: string | undefined }) {
  if (!text?.trim()) return null
  return (
    <div className="mt-3 border-t border-dashed border-border pt-3">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Explanation
      </div>
      <RichText text={text} className="text-sm leading-relaxed" />
    </div>
  )
}
