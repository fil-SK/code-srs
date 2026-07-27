import { Lightbulb } from 'lucide-react'
import { RichText } from '@/components/text/RichText'

// Shown before the answer is revealed, directly below the card — never in a
// side panel (spec §10.1: a Tip "should be easy to find"). Renders nothing if
// there's no tip, so callers can pass it unconditionally.
export function TipPanel({ text }: { text: string | undefined }) {
  if (!text?.trim()) return null
  return (
    <div className="mt-4 flex items-start gap-3 rounded-itera-card border border-itera-border bg-itera-surface p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-itera-control bg-itera-accent-soft text-itera-accent">
        <Lightbulb size={18} />
      </div>
      <div>
        <div className="text-sm font-semibold text-itera-ink-brand">Tip (optional)</div>
        <RichText text={text} className="mt-1 text-sm leading-relaxed text-itera-muted" />
      </div>
    </div>
  )
}
