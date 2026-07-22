import { RichText } from '@/components/text/RichText'

// Shown before the answer is revealed, directly below the card — never in a
// side panel (spec §10.1: a Tip "should be easy to find"). Renders nothing if
// there's no tip, so callers can pass it unconditionally.
export function TipPanel({ text }: { text: string | undefined }) {
  if (!text?.trim()) return null
  return (
    <div className="mt-4 rounded-itera-control border border-dashed border-itera-border bg-itera-accent-softer px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-itera-accent-active">
        Tip
      </div>
      <RichText text={text} className="mt-1 text-sm leading-relaxed text-itera-ink" />
    </div>
  )
}
