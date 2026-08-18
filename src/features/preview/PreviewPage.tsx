import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { subtreeIds } from '@/domain/decks/tree'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'

// Don't let deck navigation steal arrows from an interaction or an editor.
function isInteractiveTarget(target: EventTarget | null): boolean {
  return Boolean(
    target instanceof Element && target.closest(
      'button, [role="button"], [role="radio"], [role="checkbox"], input, textarea, select, [contenteditable="true"], .cm-editor',
    ),
  )
}

// Browse a deck's cards (and its subdecks') one by one. You can attempt the
// interactive cards and reveal how you did, but nothing is recorded: no
// grading, no review logs, no scheduling.
//
// The card itself is the real Review experience — `ReviewSessionScreen` with
// its session-only chrome hidden — the same path `/review` (ReviewSessionV2)
// and `cards/:id/study` (CardStudyPreviewPage) already take, so a card here
// cannot look different from the same card in a real session.
// Only this page's own chrome (back link, card counter, prev/next) is
// still local; reveal/flip/submit/grading/tip/explanation all belong to the
// shared shell now, which is also what retired this page's separate
// FlipCard/"Check answer"/result-banner/"Show question" controls.
export function PreviewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const deckParam = params.get('deck')
  const cardParam = params.get('card')
  const fromParam = params.get('from')
  const decks = useDecks()
  const allCards = useSearchCards({ includeSuspended: true })

  const scope = useMemo(() => {
    if (!deckParam) return null
    const ids = new Set(subtreeIds(decks.data ?? [], deckParam))
    const name = decks.data?.find((d) => d.id === deckParam)?.name ?? 'Deck'
    return { ids, name }
  }, [deckParam, decks.data])

  const cards = useMemo(() => {
    const list = allCards.data ?? []
    // Single-card mode (opened from a card row) shows just that card; otherwise
    // browse the whole library or a deck subtree.
    if (cardParam) return list.filter((c) => c.id === cardParam)
    const scoped = scope ? list.filter((c) => scope.ids.has(c.deckId)) : list
    return [...scoped].sort(
      (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
    )
  }, [allCards.data, scope, cardParam])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [deckParam, cardParam])

  const safeIndex = Math.min(index, Math.max(0, cards.length - 1))
  const current = cards[safeIndex]

  // The back link returns to where the user came from (the `from` param, which
  // every in-app caller passes), with sensible defaults: a deck flip-through →
  // that deck's page; a single card → the deck that card belongs to, which
  // `current` carries. Library is the fallback when nothing resolves.
  const backTo =
    fromParam ||
    (deckParam
      ? `/decks/${deckParam}`
      : current
        ? `/decks/${current.deckId}`
        : '/decks')
  const back = { to: backTo }

  const card = useMemo(() => current, [current])

  const go = useCallback((delta: number) => {
    setIndex(() => Math.min(cards.length - 1, Math.max(0, safeIndex + delta)))
  }, [cards.length, safeIndex])

  // Only prev/next lives here — reveal/submit/rating shortcuts belong to
  // ReviewSessionScreen's own listener, which is mounted below.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat || isInteractiveTarget(e.target)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      }
    }
    if (cardParam || cards.length < 2) return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cardParam, cards.length, go])

  if (allCards.isLoading || (deckParam && decks.isLoading)) {
    return <p className="text-sm text-itera-muted">Loading…</p>
  }

  if (cards.length === 0 || !current || !card) {
    return (
      <div className="mx-auto max-w-md rounded-itera-card border border-dashed border-itera-border bg-itera-surface p-10 text-center">
        <div className="text-lg font-semibold text-itera-ink-brand">
          {cardParam ? 'Card not found' : 'No cards here'}
        </div>
        <p className="mt-2 text-sm text-itera-muted">
          {cardParam
            ? 'That card could not be loaded.'
            : scope
              ? `“${scope.name}” has no cards yet.`
              : 'No cards to browse yet.'}
        </p>
        {/* `backTo` resolves to Library when the card/deck did not load, so the
            label stays neutral rather than promising a specific destination. */}
        <Link to={back.to} className="mt-4 inline-block">
          <Button variant="primary">Go back</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <IteraSurface>
        <ReviewSessionScreen
          key={current.id}
          card={card}
          definition={getInteractionDefinition(card.interaction.type)}
          current={safeIndex + 1}
          total={cards.length}
          onExit={() => navigate(back.to)}
          schedulingBefore={initialSchedulingState()}
          hideRating
          onPrevious={!cardParam ? () => go(-1) : undefined}
          onNext={!cardParam ? () => go(1) : undefined}
          previousDisabled={safeIndex === 0}
          nextDisabled={safeIndex === cards.length - 1}
        />
      </IteraSurface>
    </div>
  )
}
