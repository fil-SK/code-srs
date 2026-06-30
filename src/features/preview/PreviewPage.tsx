import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FlipCard } from '@/components/ui/FlipCard'
import { cn } from '@/lib/cn'
import { CardTypeBadge } from '@/features/cards/CardTypeBadge'
import { CardView } from '@/features/cards/CardView'
import { getCardDefinition } from '@/features/cards/registry'
import type { CardResponse } from '@/features/cards/registry/types'
import { subtreeIds } from '@/domain/decks/tree'
import { useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'

const noop = () => {}
const faceClass =
  'rounded-2xl border border-border bg-panel p-7 shadow-[var(--shadow)] min-h-[17rem] flex flex-col'

// Don't let card shortcuts (arrows / space) fire while typing in an input,
// select, or the code editor.
function isEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(
    el?.closest('input, textarea, select, [contenteditable="true"], .cm-editor'),
  )
}

// Browse a deck's cards (and its subdecks') one by one. You can attempt the
// interactive cards (MCQ, completion, ordering, matching) and reveal how you
// did, but nothing is recorded: no grading, no review logs, no scheduling.
export function PreviewPage() {
  const [params] = useSearchParams()
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
  const [revealed, setRevealed] = useState(false)
  const [response, setResponse] = useState<CardResponse>(undefined)

  useEffect(() => {
    setIndex(0)
    setRevealed(false)
    setResponse(undefined)
  }, [deckParam, cardParam])

  const safeIndex = Math.min(index, Math.max(0, cards.length - 1))
  const current = cards[safeIndex]

  const def = current ? getCardDefinition(current.type) : undefined
  const interactive = def?.interactive ?? false
  const useFlip = (def?.reveal ?? 'slide') === 'flip'
  const responseReady =
    !interactive ||
    (current ? (def?.isResponseReady?.(response, current.content) ?? true) : true)
  const autoResult =
    revealed && current && def?.autoGrade
      ? def.autoGrade(current.content, response)
      : null

  function go(delta: number) {
    setIndex(() => Math.min(cards.length - 1, Math.max(0, safeIndex + delta)))
    setRevealed(false)
    setResponse(undefined)
  }

  // Jump to a 0-based card index (from the "Card N of M" input).
  function jumpTo(target: number) {
    if (!Number.isFinite(target)) return
    setIndex(Math.min(cards.length - 1, Math.max(0, target)))
    setRevealed(false)
    setResponse(undefined)
  }

  function reveal() {
    if (responseReady) setRevealed(true)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditingTarget(e.target)) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.code === 'Space') {
        e.preventDefault()
        if (revealed) setRevealed(false)
        else reveal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, safeIndex, revealed, responseReady])

  if (allCards.isLoading || (deckParam && decks.isLoading)) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (cards.length === 0 || !current || !def) {
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

  const { Question, Answer } = def

  const header = (
    <div className="mb-4 flex items-center gap-2">
      <CardTypeBadge type={current.type} />
      {current.tags.map((tag) => (
        <span key={tag} className="font-mono text-[11.5px] text-blue">
          #{tag}
        </span>
      ))}
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <Link to={back.to} className="hover:text-text">
          {back.label}
        </Link>
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

      {useFlip ? (
        <FlipCard
          flipped={revealed}
          faceClassName={faceClass}
          onFrontClick={() => setRevealed(true)}
          front={
            <>
              {header}
              <div className="flex flex-1 flex-col justify-center">
                <Question
                  content={current.content}
                  revealed={false}
                  response={undefined}
                  setResponse={noop}
                />
              </div>
              <div className="mt-6 text-center text-xs font-medium text-faint">
                Tap or press Space to flip
              </div>
            </>
          }
          back={
            <>
              {header}
              <div className="flex-1">
                <Answer content={current.content} response={undefined} />
              </div>
            </>
          }
        />
      ) : (
        <div className={faceClass}>
          {header}
          <CardView
            card={current}
            revealed={revealed}
            response={response}
            setResponse={setResponse}
          />

          {!revealed ? (
            <Button
              variant="secondary"
              className="mt-5 w-full"
              disabled={!responseReady}
              onClick={reveal}
            >
              {interactive ? 'Check answer' : 'Show answer'}
            </Button>
          ) : (
            autoResult && (
              <div
                className={cn(
                  'reveal-in mt-4 rounded-[9px] px-3.5 py-2.5 text-sm font-semibold',
                  autoResult.correct
                    ? 'bg-green/10 text-green'
                    : 'bg-red/10 text-red',
                )}
              >
                {autoResult.correct ? 'Correct' : 'Incorrect'}
                <span className="ml-1.5 font-normal text-muted">
                  · preview, nothing recorded
                </span>
              </div>
            )
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        {cardParam ? (
          <div className="flex-1 text-center">
            <RevealToggle
              revealed={revealed}
              useFlip={useFlip}
              interactive={interactive}
              onShowQuestion={() => setRevealed(false)}
              onReveal={reveal}
            />
          </div>
        ) : (
          <>
            <Button onClick={() => go(-1)} disabled={safeIndex === 0}>
              <ChevronLeft size={16} /> Prev
            </Button>
            <RevealToggle
              revealed={revealed}
              useFlip={useFlip}
              interactive={interactive}
              onShowQuestion={() => setRevealed(false)}
              onReveal={reveal}
            />
            <Button
              onClick={() => go(1)}
              disabled={safeIndex === cards.length - 1}
            >
              Next <ChevronRight size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// Bottom-center control: flip back to the question after revealing, or (for
// flip cards) reveal. For interactive cards the in-card "Check answer" button
// is the primary reveal, so this just hints before revealing.
function RevealToggle({
  revealed,
  useFlip,
  interactive,
  onShowQuestion,
  onReveal,
}: {
  revealed: boolean
  useFlip: boolean
  interactive: boolean
  onShowQuestion: () => void
  onReveal: () => void
}) {
  if (revealed) {
    return (
      <button
        type="button"
        onClick={onShowQuestion}
        className="text-sm font-semibold text-accent hover:underline"
      >
        Show question
      </button>
    )
  }
  if (useFlip) {
    return (
      <button
        type="button"
        onClick={onReveal}
        className="text-sm font-semibold text-accent hover:underline"
      >
        Flip to answer
      </button>
    )
  }
  return (
    <span className="text-xs text-faint">
      {interactive ? 'Answer, then Check' : 'Show the answer above'}
    </span>
  )
}
