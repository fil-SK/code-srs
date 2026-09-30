import { Lightbulb } from 'lucide-react'
import { RichText } from '@/components/text/RichText'

// Shown before the answer is revealed, directly below the relevant card or
// Walkthrough step, never in a side panel (spec §10.1: a Tip "should be easy
// to find"). Renders nothing if there's no tip, so callers can pass it
// unconditionally. The optional title distinguishes step-scoped guidance.
export function TipPanel({
  text,
  title = 'Tip (optional)',
}: {
  text: string | undefined
  title?: string
}) {
  if (!text?.trim()) return null
  return (
    <div className="mt-4 flex items-start gap-3 rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-fliptap-control bg-fliptap-accent-soft text-fliptap-accent">
        <Lightbulb size={18} />
      </div>
      <div>
        <div className="text-sm font-semibold text-fliptap-ink-brand">{title}</div>
        <RichText text={text} className="mt-1 text-sm leading-relaxed text-fliptap-muted" />
      </div>
    </div>
  )
}
