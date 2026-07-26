import type { LibraryCard } from '../library-shared/fixtures'

// Deliberately small "first version" — a stat row plus exactly one
// restrained visualization (a segmented proportion bar), not a generic
// analytics dashboard and not a card-type donut. Numbers are illustrative,
// same placeholder-data spirit as MomentumPanel.tsx/PaceChart.tsx.
const SEGMENTS: { key: 'new' | 'learning' | 'review' | 'suspended'; label: string; className: string }[] = [
  { key: 'new', label: 'New', className: 'bg-blue-500' },
  { key: 'learning', label: 'Learning', className: 'bg-amber-500' },
  { key: 'review', label: 'Review', className: 'bg-itera-accent' },
  { key: 'suspended', label: 'Suspended', className: 'bg-itera-muted-light' },
]

function bucket(card: LibraryCard): 'new' | 'learning' | 'review' | 'suspended' {
  if (card.suspended) return 'suspended'
  if (card.state === 'relearning') return 'learning'
  return card.state
}

export function InsightsTab({ cards }: { cards: LibraryCard[] }) {
  const total = cards.length
  const counts = cards.reduce<Record<string, number>>((acc, c) => {
    const b = bucket(c)
    acc[b] = (acc[b] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <div className="text-xs font-bold uppercase tracking-wide text-itera-muted">Insights</div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-itera-border">
        <Stat label="Total reviews" value="164" />
        <Stat label="Retention" value="87%" />
        <Stat label="Streak on this deck" value="5 days" />
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Card status breakdown
        </div>
        {total === 0 ? (
          <p className="mt-2 text-sm text-itera-muted">No cards yet.</p>
        ) : (
          <>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-itera-pill bg-itera-border">
              {SEGMENTS.map((seg) => {
                const n = counts[seg.key] ?? 0
                if (n === 0) return null
                return (
                  <div
                    key={seg.key}
                    className={seg.className}
                    style={{ width: `${(n / total) * 100}%` }}
                    title={`${seg.label}: ${n}`}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-itera-muted">
              {SEGMENTS.map((seg) => (
                <span key={seg.key} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${seg.className}`} />
                  {seg.label} ({counts[seg.key] ?? 0})
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 first:pl-0">
      <div className="text-xs text-itera-muted">{label}</div>
      <div className="mt-1 font-itera-display text-xl font-bold text-itera-ink-brand">{value}</div>
    </div>
  )
}
