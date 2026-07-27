import { Keyboard } from 'lucide-react'

// A quiet aside for the Library sidebar's otherwise-empty space below the
// Collection tree (product feedback: reuse the Tip visual language from
// review cards - icon square + header + text - rather than a page-footer
// bar). Static content, not per-deck: there's no per-deck "tip" concept in
// the data model, so this is one fixed, generally-useful hint.
export function LibraryTip() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-itera-card border border-itera-border bg-itera-surface p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-itera-control bg-itera-accent-soft text-itera-accent">
        <Keyboard size={16} />
      </div>
      <div>
        <div className="text-sm font-semibold text-itera-ink-brand">Tip</div>
        <p className="mt-1 text-sm leading-relaxed text-itera-muted">
          During review, press <span className="font-semibold text-itera-ink">Space</span> to
          flip a card and <span className="font-semibold text-itera-ink">1–4</span> to rate it.
        </p>
      </div>
    </div>
  )
}
