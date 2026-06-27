import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Plus, Search, Trash2 } from 'lucide-react'
import type { Card, CardType } from '@/types'
import { Button } from '@/components/ui/Button'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { useDeleteCard, useSaveCard, useSearchCards } from '@/hooks/useCards'
import { CardTypeBadge } from './CardTypeBadge'
import { cardTypeMeta, getCardTitle } from './cardTypeMeta'

const ALL_TYPES = Object.keys(cardTypeMeta) as CardType[]

export function BrowsePage() {
  const [text, setText] = useState('')
  const deferredText = useDeferredValue(text)
  const [type, setType] = useState<CardType | 'all'>('all')
  const [tags, setTags] = useState<string[]>([])
  const [showSuspended, setShowSuspended] = useState(false)

  // All cards (incl. suspended) — used to build the tag filter universe.
  const allCards = useSearchCards({ includeSuspended: true })
  const availableTags = useMemo(() => {
    const set = new Set<string>()
    allCards.data?.forEach((c) => c.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [allCards.data])

  const { data: cards, isLoading } = useSearchCards({
    text: deferredText.trim() || undefined,
    types: type === 'all' ? undefined : [type],
    tags: tags.length ? tags : undefined,
    includeSuspended: showSuspended,
  })

  const saveCard = useSaveCard()
  const deleteCard = useDeleteCard()

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function toggleSuspend(card: Card) {
    saveCard.mutate({ ...card, suspended: !card.suspended })
  }

  function remove(card: Card) {
    if (window.confirm(`Delete this card?\n\n“${getCardTitle(card)}”`)) {
      deleteCard.mutate(card.id)
    }
  }

  const totalCards = allCards.data?.length ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            className={cn(fieldClass, 'pl-9')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search cards, code, tags…"
          />
        </div>
        <Link to="/cards/new">
          <Button variant="primary">
            <Plus size={15} /> New card
          </Button>
        </Link>
      </div>

      {/* Type filters */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <FilterChip active={type === 'all'} onClick={() => setType('all')}>
          All types
        </FilterChip>
        {ALL_TYPES.map((t) => (
          <FilterChip key={t} active={type === t} onClick={() => setType(t)}>
            {cardTypeMeta[t].label}
          </FilterChip>
        ))}
      </div>

      {/* Tag filters */}
      {availableTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {availableTags.map((tag) => (
            <FilterChip
              key={tag}
              active={tags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              <span className="font-mono">#{tag}</span>
            </FilterChip>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          {isLoading ? 'Loading…' : `${cards?.length ?? 0} of ${totalCards} shown`}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={showSuspended}
            onChange={(e) => setShowSuspended(e.target.checked)}
          />
          Show suspended
        </label>
      </div>

      {!isLoading && totalCards === 0 && (
        <div className="rounded-card border border-dashed border-border bg-panel p-10 text-center">
          <p className="text-sm text-muted">No cards yet.</p>
          <Link to="/cards/new" className="mt-3 inline-block">
            <Button variant="primary">Create your first card</Button>
          </Link>
        </div>
      )}

      {!isLoading && totalCards > 0 && cards?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">
          No cards match these filters.
        </p>
      )}

      <div className="space-y-2.5">
        {cards?.map((card) => (
          <div
            key={card.id}
            className={cn(
              'flex items-center gap-3 rounded-[10px] border border-border bg-panel pr-2',
              card.suspended && 'opacity-55',
            )}
          >
            <Link
              to={`/cards/${card.id}/edit`}
              className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3 hover:text-accent"
            >
              <CardTypeBadge type={card.type} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {getCardTitle(card)}
                  {card.suspended && (
                    <span className="ml-2 rounded bg-panel-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-faint">
                      Suspended
                    </span>
                  )}
                </div>
                {card.tags.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-blue">
                    {card.tags.map((tag) => (
                      <span key={tag} className="font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>

            <Link
              to={`/preview?card=${card.id}`}
              title="Preview"
              aria-label="Preview card"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-text"
            >
              <BookOpen size={16} />
            </Link>
            <button
              type="button"
              onClick={() => toggleSuspend(card)}
              title={card.suspended ? 'Unsuspend' : 'Suspend'}
              aria-label={card.suspended ? 'Unsuspend card' : 'Suspend card'}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-text"
            >
              {card.suspended ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              type="button"
              onClick={() => remove(card)}
              title="Delete"
              aria-label="Delete card"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red/10 hover:text-red"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold',
        active
          ? 'border-accent bg-accent-soft text-text'
          : 'border-border bg-panel text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  )
}
