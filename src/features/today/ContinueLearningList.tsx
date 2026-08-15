import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface ContinueRow {
  badge: string
  name: string
  description: string
  due: number
  progress: number // 0-1
}

// Placeholder rows (docs/itera-decisions.md). Real due-counts already exist
// per deck (useDueCards), but wiring them in is deliberately deferred until
// the dashboard's illustrative content is replaced as one coherent pass.
const ROWS: ContinueRow[] = [
  {
    badge: 'C++',
    name: 'C++ Fundamentals',
    description: 'Type deduction and auto',
    due: 12,
    progress: 0.55,
  },
  {
    badge: '⚙',
    name: 'Compiler Architecture',
    description: 'Instruction selection',
    due: 7,
    progress: 0.3,
  },
  { badge: 'IR', name: 'MLIR', description: 'Pattern rewriting', due: 5, progress: 0.2 },
  {
    badge: '▤',
    name: 'System Design',
    description: 'Caching and consistency',
    due: 3,
    progress: 0.15,
  },
]

export function ContinueLearningList() {
  return (
    <section aria-labelledby="continue-learning-heading">
      <div className="mb-3 flex items-center justify-between gap-4 px-0.5">
        <h2
          id="continue-learning-heading"
          className="text-base font-semibold text-itera-ink-brand"
        >
          Continue learning
        </h2>
        <Link
          to="/decks"
          className="inline-flex items-center gap-1 text-sm font-medium text-itera-accent transition-colors hover:text-itera-accent-hover"
        >
          View all topics
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-itera-card border border-itera-border bg-itera-surface shadow-[var(--itera-shadow-card)]">
        <div className="divide-y divide-itera-border">
          {ROWS.map((row) => {
            const percentage = Math.round(row.progress * 100)

            return (
              <div
                key={row.name}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[40px_minmax(0,1fr)_auto_minmax(140px,0.72fr)_auto] sm:px-5"
              >
                <div className="row-span-2 grid h-10 w-10 place-items-center rounded-itera-control bg-itera-navy font-mono text-xs font-bold text-white sm:row-span-1">
                  {row.badge}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-itera-ink-brand">
                    {row.name}
                  </div>
                  <div className="max-w-[32ch] truncate text-xs text-itera-muted">
                    {row.description}
                  </div>
                </div>

                <div className="col-start-2 row-start-2 text-xs font-bold text-itera-ink-brand sm:col-start-auto sm:row-start-auto">
                  {row.due} due
                </div>

                <div className="col-span-2 col-start-2 row-start-3 flex min-w-0 items-center gap-3 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
                  <div
                    className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-itera-pill bg-itera-border"
                    role="progressbar"
                    aria-label={`${row.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                  >
                    <div
                      className="h-full rounded-itera-pill bg-itera-accent"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 flex-none text-right text-xs text-itera-muted">
                    {percentage}%
                  </span>
                </div>

                <Link
                  to="/review"
                  className="col-start-3 row-start-1 inline-flex items-center gap-0.5 text-sm font-semibold text-itera-accent transition-colors hover:text-itera-accent-hover sm:col-start-auto sm:row-start-auto"
                >
                  Continue
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
