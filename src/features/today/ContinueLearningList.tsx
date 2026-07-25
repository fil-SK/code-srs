import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface ContinueRow {
  badge: string
  name: string
  subtitle: string
  due: number
  progress: number // 0-1
}

// Placeholder rows (docs/itera-decisions.md) — real due-counts already exist
// per deck (useDueCards), but wiring them in is deliberately deferred until
// this layout is approved, matching every row here to a real Deck at that
// point rather than guessing which four to feature now.
const ROWS: ContinueRow[] = [
  { badge: 'C++', name: 'C++ Fundamentals', subtitle: 'Type deduction and auto', due: 12, progress: 0.55 },
  { badge: '⚙', name: 'Compiler Architecture', subtitle: 'Instruction selection', due: 7, progress: 0.3 },
  { badge: 'IR', name: 'MLIR', subtitle: 'Pattern rewriting', due: 5, progress: 0.2 },
  { badge: '▤', name: 'System Design', subtitle: 'Caching and consistency', due: 3, progress: 0.15 },
]

export function ContinueLearningList() {
  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <div className="text-xs font-bold uppercase tracking-wide text-itera-muted">
        Continue learning
      </div>
      <div className="mt-1 divide-y divide-itera-border">
        {ROWS.map((row) => (
          <div key={row.name} className="flex items-center gap-3 py-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-itera-control bg-itera-navy font-mono text-xs font-bold text-white">
              {row.badge}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-itera-ink-brand">
                  {row.name}
                </span>
                <span className="flex-none text-xs text-itera-muted">{row.due} due</span>
              </div>
              <div className="truncate text-xs text-itera-muted">{row.subtitle}</div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-itera-pill bg-itera-border">
                <div
                  className="h-full rounded-itera-pill bg-itera-accent"
                  style={{ width: `${Math.round(row.progress * 100)}%` }}
                />
              </div>
            </div>
            <Link
              to="/review"
              className="flex flex-none items-center gap-0.5 text-sm font-semibold text-itera-accent hover:text-itera-accent-hover"
            >
              Continue
              <ChevronRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
