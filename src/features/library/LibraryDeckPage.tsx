import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  GalleryVerticalEnd,
  GripVertical,
  LayoutList,
  Play,
  Plus,
  Rows3,
  Search,
  Settings,
  Star,
} from 'lucide-react'
import type { Card, SchedulingStateKind } from '@/types'
import { Button } from '@/components/ui/Button'
import { fieldClass } from '@/components/ui/Field'
import { useDialogs } from '@/components/ui/dialogs'
import { cn } from '@/lib/cn'
import { flattenDeckTree, buildDeckTree } from '@/domain/decks/tree'
import { languageLabel } from '@/domain/decks/languages'
import {
  useDueCards,
  useReorderCards,
  useSearchCards,
} from '@/hooks/useCards'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'
import { INTERACTION_META } from '@/features/cards/shared/interactionTypeMeta'
import { OverflowMenu } from '@/features/cards/shared/OverflowMenu'
import { CardTableHeader, CardTableRow } from './shared/CardTable'
import { RowFilterDropdown } from './shared/RowFilterDropdown'
import { CardListFooter } from './shared/CardListFooter'
import { DeckMark } from './shared/DeckMark'
import { MasteryRing } from './shared/MasteryRing'
import { MeterBar } from './shared/MeterBar'
import { EmptyState } from './shared/EmptyState'
import { LibraryShell } from './shared/LibraryShell'
import { DeckSettings } from './DeckSettings'
import { markLabelFor } from './deckMark'
import {
  deriveCollections,
  collectionIdFor,
  collectionPathFor,
  leafDecks,
  selectionToSearchParams,
} from './collectionTree'
import { computeDeckMetrics, metricsFor } from './deckMetrics'
import { formatLastStudied } from '@/features/cards/shared/format'
import { Stat } from './shared/Stat'

const byOrder = (a: Card, b: Card) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)
const PAGE_SIZE = 7

type SortKey = 'manual' | 'dueSoon' | 'name' | 'type' | 'status'
type StatusFilter = 'all' | SchedulingStateKind | 'suspended'

// One row's worth of the data the toolbar (search/type/status/sort) and
// pagination need. CardTableRow stays untouched; this is only the metadata
// used to filter/sort/paginate before looking the card back up by id.
interface RowMeta {
  id: string
  title: string
  typeLabel: string
  state: SchedulingStateKind
  suspended: boolean
  due: number
}

function statusMatches(row: RowMeta, filter: StatusFilter): boolean {
  if (filter === 'all') return !row.suspended
  if (filter === 'suspended') return row.suspended
  return !row.suspended && row.state === filter
}

function sortRows(rows: RowMeta[], sort: SortKey): RowMeta[] {
  const copy = [...rows]
  switch (sort) {
    case 'dueSoon':
      return copy.sort((a, b) => a.due - b.due)
    case 'name':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'type':
      return copy.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel))
    case 'status':
      return copy.sort((a, b) => a.state.localeCompare(b.state))
    case 'manual':
    default:
      return copy
  }
}

// A CardTableRow made draggable: the grip handle carries the drag listeners
// and the row container gets the sortable ref/transform.
function SortableCardTableRow({
  card,
  decks,
  now,
  compact,
}: {
  card: Card
  decks: ReturnType<typeof flattenDeckTree>
  now: number
  compact: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative' as const, zIndex: 10 } : {}),
  }
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="grid h-8 w-3 cursor-grab touch-none place-items-center rounded text-itera-muted-light hover:text-itera-ink"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={13} />
    </button>
  )
  return (
    <CardTableRow
      card={card}
      decks={decks}
      leading={handle}
      containerRef={setNodeRef}
      style={style}
      now={now}
      compact={compact}
      showGrip
    />
  )
}

// The focused Deck page (/decks/:id), promoted out of a fixture preview into
// the real Library (that preview has since been deleted). A deck with children
// is reachable here too (a "Collection" is UI-only — see collectionTree.ts) and
// behaves exactly like any other deck: its own cards, not its children (deck
// nesting is browsed from the Library list).
export function LibraryDeckPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const decksQuery = useDecks()
  const createDeck = useCreateDeck()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<'cards' | 'insights'>('cards')
  const [compact, setCompact] = useState(false)
  const now = useMemo(() => Date.now(), [])

  const cardsQuery = useSearchCards({ deckId: id, includeSuspended: true })
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCardsQuery = useDueCards({ now })

  const sorted = useMemo(() => [...(cardsQuery.data ?? [])].sort(byOrder), [cardsQuery.data])
  const [cards, setCards] = useState<Card[]>(sorted)
  useEffect(() => setCards(sorted), [sorted])

  const reorder = useReorderCards()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = cards.findIndex((c) => c.id === active.id)
    const to = cards.findIndex((c) => c.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(cards, from, to)
    setCards(next)
    reorder.mutate(next)
  }

  const decks = decksQuery.data ?? []
  const collections = useMemo(() => deriveCollections(decksQuery.data ?? []), [decksQuery.data])
  const leaves = useMemo(() => leafDecks(decksQuery.data ?? []), [decksQuery.data])
  const flatDecks = useMemo(
    () => flattenDeckTree(buildDeckTree(decksQuery.data ?? [])),
    [decksQuery.data],
  )

  async function newDeck() {
    const name = await dialogs.prompt({
      title: 'New deck',
      label: 'Deck name',
      placeholder: 'e.g. Templates',
      confirmLabel: 'Create deck',
    })
    if (name) createDeck.mutate({ name })
  }

  const deck = decks.find((d) => d.id === id)

  const metricsMap = useMemo(
    () => computeDeckMetrics(allCards.data ?? [], dueCardsQuery.data ?? []),
    [allCards.data, dueCardsQuery.data],
  )

  const navDecks = useMemo(
    () =>
      leaves.map((d) => ({
        id: d.id,
        name: d.name,
        collectionId: collectionIdFor(d, collections),
        cardCount: metricsFor(metricsMap, d.id).cardCount,
      })),
    [leaves, collections, metricsMap],
  )

  // Toolbar state (Cards tab only) - search/type/status/sort + pagination.
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('manual')
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [search, typeFilter, statusFilter, sort])

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])

  const combinedMeta: RowMeta[] = useMemo(
    () =>
      cards.map((c) => ({
        id: c.id,
        title: c.prompt.value.split('\n')[0]?.trim() || '(untitled)',
        typeLabel: INTERACTION_META[c.interaction.type].label,
        state: c.scheduling.state,
        suspended: c.suspended,
        due: c.scheduling.due,
      })),
    [cards],
  )
  const typeOptions = useMemo(
    () => Array.from(new Set(combinedMeta.map((r) => r.typeLabel))).sort(),
    [combinedMeta],
  )

  const filtersActive = search.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all'
  const manualReorder = !filtersActive && sort === 'manual'

  const filteredMeta = useMemo(() => {
    let result = combinedMeta
    if (typeFilter !== 'all') result = result.filter((r) => r.typeLabel === typeFilter)
    result = result.filter((r) => statusMatches(r, statusFilter))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((r) => r.title.toLowerCase().includes(q))
    }
    return result
  }, [combinedMeta, typeFilter, statusFilter, search])

  const sortedMeta = useMemo(() => sortRows(filteredMeta, sort), [filteredMeta, sort])
  const totalPages = Math.max(1, Math.ceil(sortedMeta.length / PAGE_SIZE))
  const pageMeta = sortedMeta.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages])

  if (!decksQuery.isLoading && !deck) {
    return (
      <EmptyState
        title="Deck not found"
        description="This deck doesn't exist, or may have been deleted."
        action={
          <Link to="/decks">
            <Button variant="primary">Back to Library</Button>
          </Link>
        }
      />
    )
  }

  if (!deck) return null

  // A deck with children is a Collection (UI-only distinction, see
  // collectionTree.ts) - it has no cards-of-its-own page here. Entry points
  // that still link straight to a deck id regardless of whether it has
  // children (RoadmapCanvas, old bookmarks) land here and get bounced to the
  // Collection view instead of rendering an incorrectly-empty leaf page.
  if (collections.some((c) => c.id === deck.id)) {
    return <Navigate to={`/decks?${selectionToSearchParams({ kind: 'collection', id: deck.id })}`} replace />
  }

  const cid = collectionIdFor(deck, collections)
  const path = collectionPathFor(collections, cid)
  const metrics = metricsFor(metricsMap, deck.id)
  const totalCards = cards.length
  const markLabel =
    path.length > 0 ? markLabelFor(path[path.length - 1].name, 3) : markLabelFor(deck.name, 3)

  return (
    <LibraryShell
      collections={collections}
      decks={navDecks}
      selection={{ kind: 'collection', id: '__none__' }}
      activeDeckId={deck.id}
      onSelect={(next) => navigate(`/decks?${selectionToSearchParams(next)}`)}
      onCreateDeck={newDeck}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-sm text-itera-muted">
          <button type="button" onClick={() => navigate('/decks')} className="hover:text-itera-ink">
            Library
          </button>
          {path.map((c) => (
            <span key={c.id} className="flex items-center gap-2">
              <ChevronRight size={14} strokeWidth={1.8} />
              <button
                type="button"
                onClick={() => navigate(`/decks?${selectionToSearchParams({ kind: 'collection', id: c.id })}`)}
                className="hover:text-itera-ink"
              >
                {c.name}
              </button>
            </span>
          ))}
          <ChevronRight size={14} strokeWidth={1.8} />
          <span className="font-bold text-itera-ink-brand">{deck.name}</span>
        </nav>

        <div className="flex items-center gap-2">
          <OverflowMenu
            bordered
            ariaLabel="More deck actions"
            items={[
              {
                label: 'Flip through',
                icon: BookOpen,
                onClick: () => navigate(`/preview?deck=${id}&from=/decks/${id}`),
              },
            ]}
          />
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-itera-control border px-4 text-sm font-semibold transition-colors',
              settingsOpen
                ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                : 'border-itera-border-strong text-itera-ink hover:border-itera-accent hover:text-itera-ink-brand',
            )}
          >
            <Settings size={17} strokeWidth={1.8} /> Deck settings
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-5 sm:flex-row sm:gap-7">
          <DeckMark label={markLabel} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-itera-display text-2xl font-bold tracking-tight text-itera-ink-brand sm:text-3xl">
                {deck.name}
              </h1>
              <Star size={20} className="text-itera-muted-light" />
              {deck.language && (
                <span className="rounded-full bg-itera-navy-soft px-2 py-0.5 text-[11px] font-semibold text-itera-ink-brand">
                  {languageLabel(deck.language)}
                </span>
              )}
            </div>
            {deck.description && <p className="mt-2 max-w-md text-sm text-itera-muted">{deck.description}</p>}

            <div className="mt-8 grid w-full grid-cols-2 gap-y-5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-y-0 sm:divide-x sm:divide-itera-border">
              <div className="sm:pr-4">
                <Stat icon={GalleryVerticalEnd} label="cards" value={String(totalCards)} />
              </div>
              <div className="sm:px-4">
                <Stat
                  icon={CalendarDays}
                  label="due today"
                  value={String(metrics.dueCount)}
                  accent={metrics.dueCount > 0}
                />
              </div>
              <div className="sm:px-4">
                <Stat icon={Clock3} label="last studied" value={formatLastStudied(metrics.lastStudied, now)} />
              </div>
              <div className="flex items-center gap-3.5 sm:pl-4">
                <MasteryRing value={metrics.masteryFraction} />
                <div>
                  <div className="font-itera-display text-lg font-bold text-itera-ink-brand">
                    {Math.round(metrics.masteryFraction * 100)}%
                  </div>
                  <div className="text-xs text-itera-muted">mastery</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-none flex-col items-stretch gap-3 sm:w-56">
          {totalCards > 0 && (
            <Link to={`/review?deck=${id}`}>
              <Button variant="primary" className="w-full justify-center py-3 text-sm">
                <Play size={16} strokeWidth={1.8} /> Study Now
              </Button>
            </Link>
          )}
          <Link to={`/decks/${id}/cards/new`}>
            <Button variant="secondary" className="w-full justify-center py-3 text-sm">
              <Plus size={17} strokeWidth={1.8} /> Add Card
            </Button>
          </Link>
        </div>
      </div>

      {settingsOpen && (
        <DeckSettings deck={deck} decks={decks} onClose={() => setSettingsOpen(false)} />
      )}

      <div className="mb-6 mt-10 flex items-center gap-8 border-b border-itera-border text-base font-semibold">
        {(['cards', 'insights'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'min-w-24 border-b-2 border-itera-accent px-4 pb-3.5 text-itera-ink-brand'
                : 'min-w-24 border-b-2 border-transparent px-4 pb-3.5 text-itera-muted hover:text-itera-ink'
            }
          >
            {key === 'cards' ? 'Cards' : 'Insights'}
          </button>
        ))}
      </div>

      {tab === 'insights' ? (
        <InsightsTab meta={combinedMeta} />
      ) : (
        <>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-[280px]">
              <Search
                size={18}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-itera-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards..."
                className={`${fieldClass} h-11 bg-itera-surface pl-10`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RowFilterDropdown
                label="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[{ value: 'all', label: 'All' }, ...typeOptions.map((t) => ({ value: t, label: t }))]}
              />
              <RowFilterDropdown
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'new', label: 'New' },
                  { value: 'learning', label: 'Learning' },
                  { value: 'review', label: 'Review' },
                  { value: 'relearning', label: 'Relearning' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
              <RowFilterDropdown
                label="Sort"
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                showValueWhenDefault
                options={[
                  { value: 'manual', label: 'Manual' },
                  { value: 'dueSoon', label: 'Due soon' },
                  { value: 'name', label: 'Name' },
                  { value: 'type', label: 'Type' },
                  { value: 'status', label: 'Status' },
                ]}
              />
              <div className="flex h-11 items-center gap-0 rounded-itera-control border border-itera-border bg-itera-surface p-1">
                <button
                  type="button"
                  aria-label="Comfortable rows"
                  aria-pressed={!compact}
                  onClick={() => setCompact(false)}
                  className={cn(
                    'grid h-8 w-9 place-items-center rounded-[7px] transition-colors',
                    !compact
                      ? 'bg-itera-accent-soft text-itera-accent'
                      : 'text-itera-muted hover:text-itera-ink',
                  )}
                >
                  <LayoutList size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Compact rows"
                  aria-pressed={compact}
                  onClick={() => setCompact(true)}
                  className={cn(
                    'grid h-8 w-9 place-items-center rounded-[7px] transition-colors',
                    compact
                      ? 'bg-itera-accent-soft text-itera-accent'
                      : 'text-itera-muted hover:text-itera-ink',
                  )}
                >
                  <Rows3 size={18} />
                </button>
              </div>
            </div>
          </div>

          {!cardsQuery.isLoading && combinedMeta.length === 0 && (
            <EmptyState
              title="No cards yet"
              description="This deck doesn't have any cards yet."
              action={
                <Link to={`/decks/${id}/cards/new`}>
                  <Button variant="primary">Add a card</Button>
                </Link>
              }
            />
          )}

          {!cardsQuery.isLoading && combinedMeta.length > 0 && sortedMeta.length === 0 && (
            <EmptyState
              title="No cards match"
              description="Try a different search, type, or status filter."
            />
          )}

          {sortedMeta.length > 0 && (
            <div className="overflow-x-auto">
              <div className="px-2">
                <CardTableHeader />
              </div>
              <div className="rounded-itera-card border border-itera-border bg-itera-surface px-2">
                <div className="divide-y divide-itera-border">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext
                      items={pageMeta.map((meta) => meta.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {pageMeta.map((meta) => {
                        const card = cardById.get(meta.id)
                        if (!card) return null
                        const Row = manualReorder ? SortableCardTableRow : CardTableRow
                        return (
                          <Row
                            key={meta.id}
                            card={card}
                            decks={flatDecks}
                            now={now}
                            compact={compact}
                          />
                        )
                      })}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          )}

          {sortedMeta.length > 0 && (
            <CardListFooter
              count={sortedMeta.length}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
            />
          )}
        </>
      )}
    </LibraryShell>
  )
}

// A light breakdown from data already computed elsewhere (status per card,
// type per card) - no new metric/domain concept invented for this, just two
// distributions over the same rows the Cards tab already lists.
function InsightsTab({ meta }: { meta: RowMeta[] }) {
  const total = meta.length

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: 0,
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
      suspended: 0,
    }
    for (const row of meta) {
      if (row.suspended) counts.suspended += 1
      else counts[row.state] += 1
    }
    return counts
  }, [meta])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of meta) counts.set(row.typeLabel, (counts.get(row.typeLabel) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [meta])

  if (total === 0) {
    return <EmptyState title="Nothing to show yet" description="Add some cards to see insights for this deck." />
  }

  const statusRows: { label: string; count: number }[] = [
    { label: 'New', count: statusCounts.new },
    { label: 'Learning', count: statusCounts.learning },
    { label: 'Review', count: statusCounts.review },
    { label: 'Relearning', count: statusCounts.relearning },
    { label: 'Suspended', count: statusCounts.suspended },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-itera-muted">By status</h2>
        <div className="space-y-3">
          {statusRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-24 flex-none text-sm text-itera-ink">{row.label}</span>
              <div className="flex-1">
                <MeterBar value={total > 0 ? row.count / total : 0} />
              </div>
              <span className="w-8 flex-none text-right text-sm font-semibold text-itera-ink-brand">
                {row.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-itera-muted">By type</h2>
        <div className="space-y-3">
          {typeCounts.map(([label, count]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 flex-none truncate text-sm text-itera-ink">{label}</span>
              <div className="flex-1">
                <MeterBar value={total > 0 ? count / total : 0} />
              </div>
              <span className="w-8 flex-none text-right text-sm font-semibold text-itera-ink-brand">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
