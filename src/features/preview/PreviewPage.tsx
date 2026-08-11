import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { migrateCard } from '@/domain/migration/cardMigration'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { subtreeIds } from '@/domain/decks/tree'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'

// Don't let card shortcuts (arrows) fire while typing in an input, select, or
// the code editor.
function isEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(
    el?.closest('input, textarea, select, [contenteditable="true"], .cm-editor'),
  )
}

// Browse a deck's cards (and its subdecks') one by one. You can attempt the
// interactive cards and reveal how you did, but nothing is recorded: no
// grading, no review logs, no scheduling.
//
// The card itself is the real Review experience — `migrateCard` into the v2
// model, then `ReviewSessionScreen` with its session-only chrome hidden — the
// same path `/review` (ReviewSessionV2) and `cards/:id/study`
// (CardStudyPreviewPage) already take. It previously rendered the v1
// `CardView`/registry instead, which is why a card here could look nothing
// like the same card in a real session: two independent renderers for one
// card. Only this page's own chrome (back link, card counter, prev/next) is
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
    // Single-card mode (opened from Browse) shows just that card; otherwise
    // browse the whole library or a deck subtree.
    if (cardParam) return list.filter((c) => c.id === cardParam)
    const scoped = scope ? list.filter((c) => scope.ids.has(c.deckId)) : list
    return [...scoped].sort(
      (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
    )
  }, [allCards.data, scope, cardParam])

  // The back link returns to where the user came from (the `from` param), with
  // sensible defaults: a single card → the deck it belongs to here is unknown,
  // so Browse; a deck flip-through → that deck's page.
  const backTo =
    fromParam ||
    (deckParam ? `/decks/${deckParam}` : cardParam ? '/browse' : '/decks')
  const back = {
    to: backTo,
    label: backTo.startsWith('/decks/')
      ? '← Deck'
      : backTo === '/browse'
        ? '← Cards'
        : '← Decks',
  }

  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [deckParam, cardParam])

  const safeIndex = Math.min(index, Math.max(0, cards.length - 1))
  const current = cards[safeIndex]

  // The one lazy/on-read migration this codebase allows (see cardMigration.ts):
  // every v1 card renders through the v2 interaction registry here.
  const cardV2 = useMemo(() => (current ? migrateCard(current) : undefined), [current])

  function go(delta: number) {
    setIndex(() => Math.min(cards.length - 1, Math.max(0, safeIndex + delta)))
  }

  // Jump to a 0-based card index (from the "Card N of M" input).
  function jumpTo(target: number) {
    if (!Number.isFinite(target)) return
    setIndex(Math.min(cards.length - 1, Math.max(0, target)))
  }

  // Only prev/next lives here — reveal/submit/rating shortcuts belong to
  // ReviewSessionScreen's own listener, which is mounted below.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditingTarget(e.target)) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, safeIndex])

  if (allCards.isLoading || (deckParam && decks.isLoading)) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (cards.length === 0 || !current || !cardV2) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-dashed border-border bg-panel p-10 text-center">
        <div className="text-lg font-semibold">
          {cardParam ? 'Card not found' : 'No cards here'}
        </div>
        <p className="mt-2 text-sm text-muted">
          {cardParam
            ? 'That card could not be loaded.'
            : scope
              ? `“${scope.name}” has no cards yet.`
              : 'No cards to browse yet.'}
        </p>
        <Link to={back.to} className="mt-4 inline-block">
          <Button variant="primary">
            {cardParam ? 'Back to cards' : 'Back to decks'}
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-2">
          <Link to={back.to} className="hover:text-text">
            {back.label}
          </Link>
          {current.tags.map((tag) => (
            <span key={tag} className="font-mono text-[11.5px] text-blue">
              #{tag}
            </span>
          ))}
        </span>
        <span className="flex items-center gap-1">
          {cardParam ? (
            'Single card'
          ) : (
            <>
              {scope ? `${scope.name} · ` : ''}Card{' '}
              <input
                type="number"
                min={1}
                max={cards.length}
                value={safeIndex + 1}
                onChange={(e) => jumpTo(Number(e.target.value) - 1)}
                aria-label="Jump to card number"
                className="w-12 rounded border border-border bg-panel-2 px-1 py-0.5 text-center text-text [appearance:textfield]"
              />{' '}
              of {cards.length}
            </>
          )}
          <span className="text-faint"> · preview, no scheduling</span>
        </span>
      </div>

      <IteraSurface>
        <ReviewSessionScreen
          key={current.id}
          card={cardV2}
          definition={getInteractionDefinition(cardV2.interaction.type)}
          current={safeIndex + 1}
          total={cards.length}
          onExit={() => navigate(back.to)}
          schedulingBefore={initialSchedulingState()}
          hideTopBar
          hideRating
        />
      </IteraSurface>

      {!cardParam && (
        <div className="mt-4 flex items-center justify-between">
          <Button onClick={() => go(-1)} disabled={safeIndex === 0}>
            <ChevronLeft size={16} /> Prev
          </Button>
          <Button
            onClick={() => go(1)}
            disabled={safeIndex === cards.length - 1}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
