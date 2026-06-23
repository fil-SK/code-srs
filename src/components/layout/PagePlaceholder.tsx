// Temporary stub shown for routes whose real UI lands in a later milestone.
export function PagePlaceholder({
  title,
  note,
}: {
  title: string
  note: string
}) {
  return (
    <div className="rounded-card border border-dashed border-border bg-panel p-8">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        {note}
      </p>
    </div>
  )
}
