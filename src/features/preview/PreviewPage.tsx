import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FlipCard } from '@/components/ui/FlipCard'
import { CardTypeBadge } from '@/features/cards/CardTypeBadge'
import { CardView } from '@/features/cards/CardView'
import { correctResponse } from '@/features/cards/correctResponse'
import { getCardDefinition } from '@/features/cards/registry'
import { subtreeIds } from '@/domain/decks/tree'
import { useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'

const noop = () => {}
const faceClass =
  'rounded-2xl border border-border bg-panel p-7 shadow-[var(--shadow)] min-h-[17rem] flex flex-col'

// Browse a deck's cards (and its subdecks') one by one, flipping to see the
// answer. Read-only: no grading, no review logs, no scheduling impact.
export function PreviewPage() {
  const [params] = useSearchParams()
  const deckParam = params.get('deck')
  const cardParam = params.get('card')
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
    return [...scoped].sort((a, b) => a.createdAt - b.createdAt)
  }, [allCards.data, scope, cardParam])

  // The back link points wherever the user came from.
  const back = cardParam
    ? { to: '/browse', label: '← Cards' }
    : { to: '/', label: '← Decks' }

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setIndex(0)
    setRevealed(false)
  }, [deckParam, cardParam])

  const safeIndex = Math.min(index, Math.max(0, cards.length - 1))
  const current = cards[safeIndex]

  function go(delta: number) {
    setIndex(() => Math.min(cards.length - 1, Math.max(0, safeIndex + delta)))
    setRevealed(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.code === 'Space') {
        e.preventDefault()
        setRevealed((r) => !r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, safeIndex])

  if (allCards.isLoading || (deckParam && decks.isLoading)) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (cards.length === 0 || !current) {
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

  const def = getCardDefinition(current.type)
  const useFlip = (def.reveal ?? 'slide') === 'flip'
  const { Question, Answer } = def
  const response = revealed ? correctResponse(current) : undefined

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
        <span>
          {cardParam ? (
            'Single card'
          ) : (
            <>
              {scope ? `${scope.name} · ` : ''}Card {safeIndex + 1} of{' '}
              {cards.length}
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
            setResponse={noop}
            readOnly
          />
          {!revealed && (
            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => setRevealed(true)}
            >
              Show answer
            </Button>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        {cardParam ? (
          <div className="flex-1 text-center">
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="text-sm font-semibold text-accent hover:underline"
            >
              {revealed ? 'Show question' : 'Flip to answer'}
            </button>
          </div>
        ) : (
          <>
            <Button onClick={() => go(-1)} disabled={safeIndex === 0}>
              <ChevronLeft size={16} /> Prev
            </Button>
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="text-sm font-semibold text-accent hover:underline"
            >
              {revealed ? 'Show question' : 'Flip to answer'}
            </button>
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
