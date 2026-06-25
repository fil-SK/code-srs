import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { subtreeIds } from '@/domain/decks/tree'
import { useDueCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
import { ReviewSession } from './ReviewSession'

export function ReviewPage() {
  const [params] = useSearchParams()
  const deckParam = params.get('deck')

  // Snapshot "now" once per mount so the due query key is stable.
  const now = useMemo(() => Date.now(), [])
  const { data: allDue, isLoading } = useDueCards({ now })
  const decks = useDecks()

  // When scoped to a deck, study it plus all descendant decks.
  const scope = useMemo(() => {
    if (!deckParam) return null
    const ids = new Set(subtreeIds(decks.data ?? [], deckParam))
    const name = decks.data?.find((d) => d.id === deckParam)?.name ?? 'Deck'
    return { ids, name }
  }, [deckParam, decks.data])

  const cards = useMemo(() => {
    if (!allDue) return undefined
    return scope ? allDue.filter((c) => scope.ids.has(c.deckId)) : allDue
  }, [allDue, scope])

  const loading = isLoading || (!!deckParam && decks.isLoading)

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-dashed border-border bg-panel p-10 text-center">
        <div className="text-lg font-semibold">Nothing due 🎯</div>
        <p className="mt-2 text-sm text-muted">
          {scope
            ? `No cards due in “${scope.name}”.`
            : 'No cards are due right now. Create some or come back later.'}
        </p>
        <div className="mt-4 flex justify-center gap-2.5">
          {scope && (
            <Link to="/review">
              <Button>All decks</Button>
            </Link>
          )}
          <Link to="/cards/new">
            <Button variant="primary">New card</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {scope && (
        <div className="mx-auto mb-3 max-w-3xl text-sm text-muted">
          Studying <span className="font-semibold text-text">{scope.name}</span>{' '}
          and its subdecks ·{' '}
          <Link to="/review" className="text-accent hover:underline">
            all decks
          </Link>
        </div>
      )}
      <ReviewSession key={`${deckParam ?? 'all'}-${cards.length}`} cards={cards} />
    </div>
  )
}
