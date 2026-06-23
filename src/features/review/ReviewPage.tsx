import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useDueCards } from '@/hooks/useCards'
import { ReviewSession } from './ReviewSession'

export function ReviewPage() {
  // Snapshot "now" once per mount so the due query key is stable.
  const now = useMemo(() => Date.now(), [])
  const { data: cards, isLoading } = useDueCards({ now })

  if (isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-dashed border-border bg-panel p-10 text-center">
        <div className="text-lg font-semibold">Nothing due 🎯</div>
        <p className="mt-2 text-sm text-muted">
          No cards are due right now. Create some or come back later.
        </p>
        <Link to="/cards/new" className="mt-4 inline-block">
          <Button variant="primary">New card</Button>
        </Link>
      </div>
    )
  }

  // key forces a fresh session if the due set changes between visits.
  return <ReviewSession key={cards.length} cards={cards} />
}
