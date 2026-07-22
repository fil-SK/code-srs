// Small, quiet label naming the active interaction type ("Recall", "Multiple
// Choice", ...), placed near the card's top edge per spec §16.1/§17.1/etc.
// Shared across every interaction type's front face, not Recall-specific.
export function InteractionLabel({ text }: { text: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-itera-muted">
      {text}
    </div>
  )
}
