import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { subtreeIds } from '@/domain/decks/tree'
import { resolveSessionLimit } from '@/domain/stats/todayMetrics'
import { useDueCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { ReviewSessionV2 } from './ReviewSessionV2'
import { useSessionQueue } from './useSessionQueue'

// Query contract:
//   (none)          - every due card
//   ?deck=<id>      - that deck and its whole subtree
//   ?limit=<n>      - the first n cards of the queue, applied once when the
//                     session snapshot is taken. Anything that is not a
//                     positive integer is ignored rather than rejected.
// Neither parameter is persisted; a later plain /review is the default queue
// again. See useSessionQueue for the snapshot lifecycle.
export function ReviewPage() {
  const [params] = useSearchParams()
  const deckParam = params.get('deck')
  const limit = resolveSessionLimit(params.get('limit'))

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

  const decksLoading = !!deckParam && decks.isLoading

  const resolved = useMemo(() => {
    if (!allDue || decksLoading) return undefined
    const scoped = scope ? allDue.filter((c) => scope.ids.has(c.deckId)) : allDue
    return limit === undefined ? scoped : scoped.slice(0, limit)
  }, [allDue, scope, decksLoading, limit])

  // The queue is frozen here: everything below reads the snapshot, never the
  // live query, so a grade-triggered refetch cannot reshape a running session.
  const session = useSessionQueue(`${deckParam ?? 'all'}|${limit ?? 'all'}`, resolved)

  const loading = isLoading || decksLoading

  // Review is a top-level, chrome-free route (no AppShell ancestor providing
  // IteraSurface), so every return branch here wraps itself — the loading/
  // empty branches previously relied on AppShell for this; ReviewSessionV2
  // below already self-wraps and needs no change.
  if (loading || !session) {
    return (
      <IteraSurface className="grid min-h-screen place-items-center">
        <p className="text-sm text-itera-muted">Loading…</p>
      </IteraSurface>
    )
  }

  if (session.cards.length === 0) {
    return (
      <IteraSurface className="grid min-h-screen place-items-center px-4">
        <div className="mx-auto max-w-md rounded-itera-card border border-dashed border-itera-border bg-itera-surface p-10 text-center">
          <div className="text-lg font-semibold text-itera-ink-brand">Nothing due 🎯</div>
          <p className="mt-2 text-sm text-itera-muted">
            {scope
              ? `No cards due in “${scope.name}”. Open the deck to add cards or study ahead.`
              : 'No cards are due right now. Add cards from a deck, or come back later.'}
          </p>
          {/* Creating a card requires a deck (/decks/:deckId/cards/new), so the
              CTA points at a deck page or the Library rather than a bare create
              route. The scoped deck page also handles the
              deck-with-children redirect on its own. */}
          <div className="mt-4 flex justify-center gap-2.5">
            {scope && (
              <Link to="/review">
                <Button>All decks</Button>
              </Link>
            )}
            <Link to={deckParam ? `/decks/${deckParam}` : '/decks'}>
              <Button variant="primary">{deckParam ? 'Open deck' : 'Go to Library'}</Button>
            </Link>
          </div>
        </div>
      </IteraSurface>
    )
  }

  return (
    <IteraSurface className="min-h-screen">
      {scope && (
        <div className="mx-auto max-w-3xl px-4 pt-4 text-sm text-itera-muted">
          Studying <span className="font-semibold text-itera-ink-brand">{scope.name}</span>{' '}
          and its subdecks ·{' '}
          <Link to="/review" className="text-itera-accent hover:underline">
            all decks
          </Link>
        </div>
      )}
      {/* Keyed by the snapshot id, never by the live queue's length - the
          latter remounted the session on every grade. */}
      <ReviewSessionV2 key={session.id} cards={session.cards} />
    </IteraSurface>
  )
}
