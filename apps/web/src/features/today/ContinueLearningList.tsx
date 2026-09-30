import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ContinueRow } from '@/domain/stats/todayMetrics'
import { markLabelFor } from '@/features/library/deckMark'

// Real decks, ordered by domain/stats/todayMetrics#buildContinueLearning. The
// four fixture rows this shipped with (C++ Fundamentals, Compiler
// Architecture, MLIR, System Design) are gone; nothing here is manufactured,
// so a deck with no description simply shows none.
//
// The heading link used to read "View all topics". There is no topic concept
// in this product - decks are the only grouping - so it says decks now.
export function ContinueLearningList({ rows }: { rows: ContinueRow[] }) {
  return (
    <section aria-labelledby="continue-learning-heading">
      <div className="mb-3 flex items-center justify-between gap-4 px-0.5">
        <h2
          id="continue-learning-heading"
          className="text-base font-semibold text-fliptap-ink-brand"
        >
          Continue learning
        </h2>
        <Link
          to="/decks"
          className="inline-flex items-center gap-1 text-sm font-medium text-fliptap-accent transition-colors hover:text-fliptap-accent-hover"
        >
          View all decks
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-fliptap-card border border-fliptap-border bg-fliptap-surface shadow-[var(--fliptap-shadow-card)]">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fliptap-muted">
            No decks yet. Create one in the Library to start learning.
          </p>
        ) : (
          <div className="divide-y divide-fliptap-border">
            {rows.map((row) => {
              const percentage = Math.round(row.masteryFraction * 100)
              // A deck with nothing due must not offer a session that would
              // immediately land on "Nothing due" - it opens the deck instead.
              const actionable = row.dueCount > 0

              return (
                <div
                  key={row.deckId}
                  className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-fliptap-surface-subtle sm:grid-cols-[40px_minmax(0,1fr)_auto_minmax(140px,0.72fr)_auto] sm:px-5"
                >
                  <div className="row-span-2 grid h-10 w-10 place-items-center rounded-fliptap-control bg-fliptap-navy font-mono text-xs font-bold text-white sm:row-span-1">
                    {markLabelFor(row.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-fliptap-ink-brand">
                      {row.name}
                    </div>
                    {row.description && (
                      <div className="max-w-[32ch] truncate text-xs text-fliptap-muted">
                        {row.description}
                      </div>
                    )}
                  </div>

                  <div className="col-start-2 row-start-2 text-xs font-bold text-fliptap-ink-brand sm:col-start-auto sm:row-start-auto">
                    {row.dueCount} due
                  </div>

                  <div className="col-span-2 col-start-2 row-start-3 flex min-w-0 items-center gap-3 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
                    <div
                      className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-fliptap-pill bg-fliptap-border"
                      role="progressbar"
                      aria-label={`${row.name} progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <div
                        className="h-full rounded-fliptap-pill bg-fliptap-accent"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 flex-none text-right text-xs text-fliptap-muted">
                      {percentage}%
                    </span>
                  </div>

                  <Link
                    to={actionable ? `/review?deck=${row.deckId}` : `/decks/${row.deckId}`}
                    className="col-start-3 row-start-1 inline-flex items-center gap-0.5 text-sm font-semibold text-fliptap-accent transition-colors hover:text-fliptap-accent-hover sm:col-start-auto sm:row-start-auto"
                  >
                    {actionable ? 'Continue' : 'Open'}
                    <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
