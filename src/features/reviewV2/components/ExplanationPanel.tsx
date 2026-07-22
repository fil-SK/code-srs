import { RichText } from '@/components/text/RichText'

// Shown after reveal, below the answer and above the rating controls (spec
// §10.1/§10.2). Renders nothing if there's no explanation.
export function ExplanationPanel({ text }: { text: string | undefined }) {
  if (!text?.trim()) return null
  return (
    <div className="mt-4 border-t border-dashed border-itera-border pt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-itera-muted">
        Explanation
      </div>
      <RichText text={text} className="mt-1 text-sm leading-relaxed text-itera-ink" />
    </div>
  )
}
