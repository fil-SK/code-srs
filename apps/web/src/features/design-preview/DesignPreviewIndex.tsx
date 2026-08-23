import { Link } from 'react-router-dom'
import { PreviewShell } from './PreviewShell'

const ROUTES = [
  { path: '/design-preview/review/recall', label: 'Recall' },
  { path: '/design-preview/review/multiple-choice', label: 'Multiple Choice' },
  { path: '/design-preview/review/write-code', label: 'Write Code' },
  { path: '/design-preview/review/ordering', label: 'Ordering' },
  { path: '/design-preview/review/matching', label: 'Matching' },
  { path: '/design-preview/review/walkthrough', label: 'Walkthrough' },
]

export function DesignPreviewIndex() {
  return (
    <PreviewShell>
      <h1 className="text-2xl font-bold text-itera-ink-brand">Design preview</h1>
      <p className="mt-2 text-sm text-itera-muted">
        The six review interactions rendered against fixtures. These use the same
        production ReviewSessionScreen as /review, so they cannot drift from it.
      </p>
      <ul className="mt-6 space-y-2">
        {ROUTES.map((r) => (
          <li key={r.path}>
            <Link
              to={r.path}
              className="block rounded-itera-control border border-itera-border bg-itera-surface px-4 py-3 text-sm font-semibold text-itera-ink-brand hover:border-itera-accent"
            >
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
    </PreviewShell>
  )
}
