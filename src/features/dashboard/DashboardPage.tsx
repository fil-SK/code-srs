import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FolderTree, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'

export function DashboardPage() {
  const now = useMemo(() => Date.now(), [])
  const decks = useDecks()
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCards = useDueCards({ now })

  const totalDue = dueCards.data?.length ?? 0
  const totalCards = allCards.data?.length ?? 0

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Due today" value={totalDue} hint="ready to review" />
        <Stat label="Cards" value={totalCards} hint="across all decks" />
        <Stat label="Decks" value={decks.data?.length ?? 0} hint="incl. subdecks" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {totalDue > 0 && (
          <Link to="/review">
            <Button variant="primary">
              <Play size={15} /> Study {totalDue} due now
            </Button>
          </Link>
        )}
        <Link to="/decks">
          <Button variant="secondary">
            <FolderTree size={15} /> Manage decks
          </Button>
        </Link>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-card border border-border bg-panel p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-faint">{hint}</div>
    </div>
  )
}
