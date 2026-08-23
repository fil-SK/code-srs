import { BookOpen } from 'lucide-react'
import { RichText } from '@/components/text/RichText'

// Shown after reveal/submission, below the relevant answer or Walkthrough step
// and before the rating controls (spec §10.1/§10.2). Renders nothing if there
// is no explanation. The optional title distinguishes step-scoped context.
export function ExplanationPanel({
  text,
  title = 'Explanation',
}: {
  text: string | undefined
  title?: string
}) {
  if (!text?.trim()) return null
  return (
    <div className="mt-4 flex items-start gap-3 rounded-itera-card border border-itera-border bg-itera-surface p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-itera-control bg-itera-navy-soft text-itera-navy">
        <BookOpen size={18} />
      </div>
      <div>
        <div className="text-sm font-semibold text-itera-ink-brand">{title}</div>
        <RichText text={text} className="mt-1 text-sm leading-relaxed text-itera-muted" />
      </div>
    </div>
  )
}
