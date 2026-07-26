import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, LayoutList, Rows3, Search, Settings, Star, MoreHorizontal } from 'lucide-react'
import { LibraryPreviewShell } from '../library-shared/LibraryPreviewShell'
import type { LibrarySelection } from '../library-shared/CollectionNav'
import { libraryCards, libraryCollections, libraryDecks, type LibraryCard } from '../library-shared/fixtures'
import type { LibraryCollection } from '../library-shared/fixtures'
import { DeckMark } from '../library-shared/DeckMark'
import { MasteryRing } from '../library-shared/MasteryRing'
import { EmptyState } from '../library-shared/EmptyState'
import { formatLastStudied } from '../library-shared/format'
import { InteractionTypeBadge } from '../library-shared/InteractionTypeBadge'
import { INTERACTION_TYPES } from '../library-shared/interactionTypeMeta'
import { fieldClass, selectClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { CardRow, CardTableHeader } from './CardRow'
import { InsightsTab } from './InsightsTab'
import type { InteractionType } from '@/types/cardV2'
import type { SchedulingStateKind } from '@/types/review'

function collectionPath(collections: LibraryCollection[], collectionId: string | undefined): LibraryCollection[] {
  if (!collectionId) return []
  const byId = new Map(collections.map((c) => [c.id, c]))
  const path: LibraryCollection[] = []
  let current = byId.get(collectionId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

type StatusFilter = SchedulingStateKind | 'suspended'
type SortKey = 'due' | 'type' | 'status' | 'title'

function sortCards(cards: LibraryCard[], sort: SortKey): LibraryCard[] {
  const copy = [...cards]
  switch (sort) {
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'type':
      return copy.sort((a, b) => a.interaction.localeCompare(b.interaction))
    case 'status':
      return copy.sort((a, b) => a.state.localeCompare(b.state))
    case 'due':
      return copy.sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity))
  }
}

export function LibraryDeckPreviewPage() {
  const now = useMemo(() => Date.now(), [])
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const deck = libraryDecks.find((d) => d.id === deckId)

  const [starred, setStarred] = useState(false)
  const [tab, setTab] = useState<'cards' | 'insights'>('cards')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<Set<InteractionType>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('due')
  const [compact, setCompact] = useState(false)

  const cards = useMemo(() => (deck ? libraryCards.filter((c) => c.deckId === deck.id) : []), [deck])

  const filteredCards = useMemo(() => {
    let result = cards
    if (typeFilter.size > 0) result = result.filter((c) => typeFilter.has(c.interaction))
    if (statusFilter !== 'all') {
      result = result.filter((c) => (statusFilter === 'suspended' ? c.suspended : !c.suspended && c.state === statusFilter))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return sortCards(result, sort)
  }, [cards, typeFilter, statusFilter, search, sort])

  const selection: LibrarySelection = deck?.collectionId
    ? { kind: 'collection', id: deck.collectionId }
    : { kind: 'unfiled' }

  const handleSelect = () => navigate('/design-preview/library')

  if (!deck) {
    return (
      <LibraryPreviewShell
        collections={libraryCollections}
        decks={libraryDecks}
        selection={{ kind: 'all' }}
        onSelect={handleSelect}
      >
        <EmptyState
          title="Deck not found"
          description="This deck doesn't exist in the preview fixture set."
          action={
            <button
              type="button"
              onClick={() => navigate('/design-preview/library')}
              className="rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white hover:brightness-105"
            >
              Back to Library
            </button>
          }
        />
      </LibraryPreviewShell>
    )
  }

  const path = collectionPath(libraryCollections, deck.collectionId)

  return (
    <LibraryPreviewShell
      collections={libraryCollections}
      decks={libraryDecks}
      selection={selection}
      onSelect={handleSelect}
    >
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-itera-muted">
        <button type="button" onClick={() => navigate('/design-preview/library')} className="hover:text-itera-ink">
          Library
        </button>
        {path.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <ChevronRight size={13} />
            <button
              type="button"
              onClick={() => navigate('/design-preview/library')}
              className="hover:text-itera-ink"
            >
              {c.name}
            </button>
          </span>
        ))}
        <ChevronRight size={13} />
        <span className="font-medium text-itera-ink">{deck.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <DeckMark label={deck.markLabel} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-itera-display text-2xl font-bold tracking-tight text-itera-ink-brand">
                {deck.name}
              </h1>
              <button
                type="button"
                onClick={() => setStarred((v) => !v)}
                aria-label={starred ? 'Unstar deck' : 'Star deck'}
                className="text-itera-muted hover:text-itera-accent"
              >
                <Star size={18} fill={starred ? 'var(--itera-accent)' : 'none'} className={starred ? 'text-itera-accent' : undefined} />
              </button>
            </div>
            {deck.description && <p className="mt-1 max-w-md text-sm text-itera-muted">{deck.description}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-6">
              <Stat label="cards" value={String(deck.cardCount)} />
              <Stat label="due today" value={String(deck.dueCount)} accent={deck.dueCount > 0} />
              <Stat label="last studied" value={formatLastStudied(deck.lastStudied, now)} />
              <div className="flex items-center gap-2">
                <MasteryRing value={deck.mastery} />
                <div>
                  <div className="font-itera-display text-lg font-bold text-itera-ink-brand">
                    {Math.round(deck.mastery * 100)}%
                  </div>
                  <div className="text-xs text-itera-muted">mastery</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            aria-label="Deck actions"
            className="grid h-10 w-10 place-items-center rounded-itera-control border border-itera-border text-itera-ink hover:border-itera-border-strong"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-itera-control border border-itera-border px-3.5 py-2 text-sm font-semibold text-itera-ink hover:border-itera-border-strong"
          >
            <Settings size={15} />
            Deck settings
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-itera-control border border-itera-border px-3.5 py-2 text-sm font-semibold text-itera-ink hover:border-itera-border-strong"
          >
            Add Card
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105"
          >
            Study Now
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5 border-b border-itera-border text-sm">
        <button
          type="button"
          onClick={() => setTab('cards')}
          className={cn(
            'border-b-2 pb-2 font-semibold transition-colors',
            tab === 'cards' ? 'border-itera-accent text-itera-ink-brand' : 'border-transparent text-itera-muted',
          )}
        >
          Cards
        </button>
        <button
          type="button"
          onClick={() => setTab('insights')}
          className={cn(
            'border-b-2 pb-2 font-semibold transition-colors',
            tab === 'insights' ? 'border-itera-accent text-itera-ink-brand' : 'border-transparent text-itera-muted',
          )}
        >
          Insights
        </button>
      </div>

      {tab === 'cards' ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-itera-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards..."
                className={`${fieldClass} pl-9`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter | 'all')}
              className={`${selectClass} w-auto`}
            >
              <option value="all">Status: All</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="review">Review</option>
              <option value="relearning">Relearning</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={`${selectClass} w-auto`}
            >
              <option value="due">Sort: Due soon</option>
              <option value="type">Sort: Type</option>
              <option value="status">Sort: Status</option>
              <option value="title">Sort: Title</option>
            </select>
            <div className="flex items-center gap-1 rounded-itera-control border border-itera-border p-0.5">
              <button
                type="button"
                aria-label="Comfortable rows"
                onClick={() => setCompact(false)}
                className={cn('grid h-7 w-7 place-items-center rounded-[7px]', !compact ? 'bg-itera-surface-subtle text-itera-ink' : 'text-itera-muted')}
              >
                <LayoutList size={15} />
              </button>
              <button
                type="button"
                aria-label="Compact rows"
                onClick={() => setCompact(true)}
                className={cn('grid h-7 w-7 place-items-center rounded-[7px]', compact ? 'bg-itera-surface-subtle text-itera-ink' : 'text-itera-muted')}
              >
                <Rows3 size={15} />
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {INTERACTION_TYPES.map((type) => {
              const active = typeFilter.has(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setTypeFilter((prev) => {
                      const next = new Set(prev)
                      if (next.has(type)) next.delete(type)
                      else next.add(type)
                      return next
                    })
                  }
                  className={cn(
                    'rounded-itera-control border px-2.5 py-1',
                    active ? 'border-itera-accent bg-itera-accent-soft' : 'border-itera-border hover:border-itera-border-strong',
                  )}
                >
                  <InteractionTypeBadge type={type} />
                </button>
              )
            })}
          </div>

          {cards.length === 0 ? (
            <EmptyState title="No cards yet" description="This deck doesn't have any cards yet." />
          ) : filteredCards.length === 0 ? (
            <EmptyState
              title="No cards match your filters"
              description="Try a different search term or clear the active filters."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setTypeFilter(new Set())
                    setStatusFilter('all')
                  }}
                  className="rounded-itera-control border border-itera-border px-3.5 py-2 text-sm font-semibold text-itera-ink hover:border-itera-border-strong"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-itera-card border border-itera-border bg-itera-surface px-4">
              <CardTableHeader />
              <div className="divide-y divide-itera-border">
                {filteredCards.map((card) => (
                  <CardRow key={card.id} card={card} now={now} compact={compact} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <InsightsTab cards={cards} />
        </div>
      )}
    </LibraryPreviewShell>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={cn('font-itera-display text-lg font-bold', accent ? 'text-itera-accent' : 'text-itera-ink-brand')}>
        {value}
      </div>
      <div className="text-xs text-itera-muted">{label}</div>
    </div>
  )
}
