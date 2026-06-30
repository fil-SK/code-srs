import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FolderTree, Play } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'

function firstName(email: string | undefined): string | null {
  if (!email) return null
  const handle = email.split('@')[0].split(/[._-]/)[0]
  return handle ? handle.charAt(0).toUpperCase() + handle.slice(1) : null
}

export function DashboardPage() {
  const now = useMemo(() => Date.now(), [])
  const { email } = useAuth()
  const decks = useDecks()
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCards = useDueCards({ now })

  const totalDue = dueCards.data?.length ?? 0
  const totalCards = allCards.data?.length ?? 0

  const name = firstName(email)
  const subline =
    totalDue > 0
      ? `You have ${totalDue} card${totalDue === 1 ? '' : 's'} due — let's go through them.`
      : totalCards > 0
        ? "You're all caught up. Nice work."
        : "Let's add your first cards and start learning."

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Hello{name ? `, ${name}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-muted">{subline}</p>
      </div>

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
