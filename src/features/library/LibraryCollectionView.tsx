import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  Clock,
  Folder,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react'
import type { Deck, ID } from '@/types'
import { Button } from '@/components/ui/Button'
import { fieldClass } from '@/components/ui/Field'
import { useDialogs } from '@/components/ui/dialogs'
import { cn } from '@/lib/cn'
import { languageLabel } from '@/domain/decks/languages'
import { flattenDeckTree, buildDeckTree } from '@/domain/decks/tree'
import { useSearchCards } from '@/hooks/useCards'
import { useCreateDeck, useDeleteDeck, useSaveDeck } from '@/hooks/useDecks'
import { OverflowMenu } from '@/features/cards/shared/OverflowMenu'
import { CardTableHeader, CardTableRow } from './shared/CardTable'
import { RowFilterDropdown } from './shared/RowFilterDropdown'
import { CardListFooter } from './shared/CardListFooter'
import { DeckMark } from './shared/DeckMark'
import { EmptyState } from './shared/EmptyState'
import { Stat } from './shared/Stat'
import { DeckTableHeader, DeckRow } from './DeckRow'
import { DeckSettings } from './DeckSettings'
import { markLabelFor } from './deckMark'
import {
  collectionIdFor,
  collectionPathFor,
  getSubtreeCollectionIds,
  leafDecks,
  type LibraryCollection,
  type LibrarySelection,
} from './collectionTree'
import { aggregateMetrics, metricsFor, type DeckMetrics } from './deckMetrics'
import { sortDecks, type DeckSortKey } from './shared/sortDecks'
import { formatLastStudied } from '@/features/cards/shared/format'

const PAGE_SIZE = 10

// Rendered by LibraryBrowserPage when `selection.kind === 'collection'` - the
// Collection/container identity view for a legacy Deck-with-children (see
// docs/itera-decisions.md D8: a "Collection" is UI-only, derived from
// Deck.parentId, not a real entity). Deliberately shares the focused Deck
// page's shell primitives (DeckMark, Stat, CardTable*, CardListFooter,
// RowFilterDropdown, DeckRow) rather than the flat admin-table look the
// generic Library browser used to fall back to for any scoped selection.
export function LibraryCollectionView({
  collectionId,
  decks,
  collections,
  metrics,
  now,
  onSelect,
}: {
  collectionId: string
  decks: Deck[]
  collections: LibraryCollection[]
  metrics: Map<ID, DeckMetrics>
  now: number
  onSelect: (selection: LibrarySelection) => void
}) {
  const dialogs = useDialogs()
  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()
  const deleteDeck = useDeleteDeck()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<DeckSortKey>('name')
  const [dueOnly, setDueOnly] = useState(false)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [search, sort, dueOnly, collectionId])

  const deck = decks.find((d) => d.id === collectionId)
  const leaves = useMemo(() => leafDecks(decks), [decks])
  const flatDecks = useMemo(() => flattenDeckTree(buildDeckTree(decks)), [decks])
  const path = useMemo(() => collectionPathFor(collections, collectionId), [collections, collectionId])
  const ancestors = path.slice(0, -1)

  const scoped = useMemo(() => {
    const ids = getSubtreeCollectionIds(collections, collectionId)
    return leaves.filter((d) => {
      const cid = collectionIdFor(d, collections)
      return cid !== undefined && ids.includes(cid)
    })
  }, [leaves, collections, collectionId])

  const filtered = useMemo(() => {
    let result = scoped
    if (dueOnly) result = result.filter((d) => metricsFor(metrics, d.id).dueCount > 0)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
      )
    }
    return sortDecks(result, sort, metrics)
  }, [scoped, search, sort, dueOnly, metrics])

  const agg = useMemo(() => aggregateMetrics(metrics, scoped.map((d) => d.id)), [metrics, scoped])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // A legacy Deck can (rarely) have both child Decks and cards of its own -
  // the pre-Collection data model never forbade it. Surfaced as its own
  // section below rather than silently hidden.
  const directCards = useSearchCards({ deckId: collectionId, includeSuspended: true })
  const directCount = directCards.data?.length ?? 0

  async function newDeck() {
    const name = await dialogs.prompt({
      title: 'New deck',
      description: deck ? `It will be created inside “${deck.name}”.` : undefined,
      label: 'Deck name',
      placeholder: 'e.g. Templates',
      confirmLabel: 'Create deck',
    })
    if (name) createDeck.mutate({ name, parentId: collectionId })
  }

  async function renameChild(child: Deck) {
    const name = await dialogs.prompt({
      title: 'Rename deck',
      label: 'Deck name',
      initialValue: child.name,
      confirmLabel: 'Rename',
    })
    if (name && name !== child.name) saveDeck.mutate({ ...child, name })
  }

  async function removeChild(child: Deck, cardCount: number) {
    if (cardCount > 0) {
      await dialogs.alert({
        title: `“${child.name}” isn’t empty`,
        description: `It still has ${cardCount} card${cardCount === 1 ? '' : 's'}. Move or delete them first.`,
      })
      return
    }
    const ok = await dialogs.confirm({
      title: 'Delete this deck?',
      description: `“${child.name}” will be removed permanently. This cannot be undone.`,
      danger: true,
    })
    if (ok) deleteDeck.mutate(child.id)
  }


  async function deleteCollection() {
    if (!deck) return
    if (scoped.length > 0 || directCount > 0) {
      await dialogs.alert({
        title: `“${deck.name}” isn’t empty`,
        description: `It still contains ${scoped.length} deck${scoped.length === 1 ? '' : 's'}${
          directCount > 0 ? ' and cards of its own' : ''
        }. Move or delete them first.`,
      })
      return
    }
    const ok = await dialogs.confirm({
      title: 'Delete this collection?',
      description: `“${deck.name}” will be removed permanently. This cannot be undone.`,
      danger: true,
    })
    if (!ok) return
    deleteDeck.mutate(deck.id)
    onSelect(ancestors.length > 0 ? { kind: 'collection', id: ancestors[ancestors.length - 1].id } : { kind: 'all' })
  }

  if (!deck) return null

  const markLabel = markLabelFor(deck.name, 3)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm text-itera-muted">
          <button type="button" onClick={() => onSelect({ kind: 'all' })} className="hover:text-itera-ink">
            Library
          </button>
          {ancestors.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <ChevronRight size={13} />
              <button
                type="button"
                onClick={() => onSelect({ kind: 'collection', id: c.id })}
                className="hover:text-itera-ink"
              >
                {c.name}
              </button>
            </span>
          ))}
          <ChevronRight size={13} />
          <span className="font-medium text-itera-ink">{deck.name}</span>
        </nav>

        <div className="flex items-center gap-2">
          <OverflowMenu
            bordered
            ariaLabel="More collection actions"
            items={[{ label: 'Delete collection', icon: Trash2, danger: true, onClick: deleteCollection }]}
          />
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-itera-control border px-3.5 text-sm font-semibold transition-colors',
              settingsOpen
                ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                : 'border-itera-border-strong text-itera-ink hover:border-itera-accent hover:text-itera-ink-brand',
            )}
          >
            <Settings size={15} /> Collection settings
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="flex min-w-0 flex-1 items-start gap-6">
          <DeckMark label={markLabel} size="lg" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-itera-display text-3xl font-bold tracking-tight text-itera-ink-brand">
                {deck.name}
              </h1>
              {deck.language && (
                <span className="rounded-full bg-itera-navy-soft px-2 py-0.5 text-[11px] font-semibold text-itera-ink-brand">
                  {languageLabel(deck.language)}
                </span>
              )}
            </div>
            {deck.description && <p className="mt-2 max-w-md text-sm text-itera-muted">{deck.description}</p>}

            <div className="mt-7 flex flex-wrap items-center divide-x divide-itera-border">
              <div className="pr-6">
                <Stat icon={Folder} label="decks" value={String(agg.deckCount)} />
              </div>
              <div className="px-6">
                <Stat icon={BookOpen} label="cards" value={String(agg.cardCount)} />
              </div>
              <div className={agg.lastStudied ? 'px-6' : 'pl-6'}>
                <Stat icon={CalendarClock} label="due today" value={String(agg.dueCount)} accent={agg.dueCount > 0} />
              </div>
              {agg.lastStudied && (
                <div className="pl-6">
                  <Stat icon={Clock} label="last studied" value={formatLastStudied(agg.lastStudied, now)} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-56 flex-none flex-col items-stretch gap-2.5">
          <Button variant="primary" onClick={newDeck} className="w-full justify-center py-2.5 text-sm">
            <Plus size={15} /> New Deck
          </Button>
        </div>
      </div>

      {settingsOpen && (
        <DeckSettings deck={deck} decks={decks} onClose={() => setSettingsOpen(false)} />
      )}

      <h2 className="mb-5 mt-9 border-b border-itera-border pb-2.5 text-sm font-bold text-itera-ink-brand">
        Decks
      </h2>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[280px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-itera-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decks..."
            className={`${fieldClass} pl-9`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-itera-control border px-3 py-2 text-sm font-semibold',
              dueOnly
                ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                : 'border-itera-border text-itera-ink hover:border-itera-border-strong',
            )}
          >
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              className="accent-itera-accent"
            />
            Due only
          </label>
          <RowFilterDropdown
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as DeckSortKey)}
            showValueWhenDefault
            options={[
              { value: 'name', label: 'Name' },
              { value: 'due', label: 'Due soon' },
              { value: 'lastStudied', label: 'Last studied' },
              { value: 'cardCount', label: 'Card count' },
            ]}
          />
        </div>
      </div>

      {scoped.length === 0 ? (
        <EmptyState
          title="No decks yet"
          description="Add a deck to this collection to get started."
          action={
            <Button variant="primary" onClick={newDeck}>
              + New Deck
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No decks match" description="Try a different search or filter." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="px-5">
              <DeckTableHeader />
            </div>
            <div className="rounded-itera-card border border-itera-border bg-itera-surface px-4">
              <div className="divide-y divide-itera-border">
                {paged.map((child) => (
                  <DeckRow
                    key={child.id}
                    deck={child}
                    metrics={metricsFor(metrics, child.id)}
                    now={now}
                    onRename={renameChild}
                    onDelete={removeChild}
                  />
                ))}
              </div>
            </div>
          </div>
          <CardListFooter
            count={filtered.length}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemLabel="deck"
            showTip={false}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {directCount > 0 && (
        <>
          <h2 className="mb-2 mt-9 border-b border-itera-border pb-2.5 text-sm font-bold text-itera-ink-brand">
            Cards
          </h2>
          <p className="mb-5 text-xs text-itera-muted">
            These cards are filed directly in this collection (legacy compatibility) - move them into one of the
            decks above when convenient.
          </p>
          <div className="overflow-x-auto">
            <div className="px-5">
              <CardTableHeader />
            </div>
            <div className="rounded-itera-card border border-itera-border bg-itera-surface px-4">
              <div className="divide-y divide-itera-border">
                {(directCards.data ?? []).map((card) => (
                  <CardTableRow key={card.id} card={card} decks={flatDecks} now={now} />
                ))}
              </div>
            </div>
          </div>
          <CardListFooter count={directCount} page={1} totalPages={1} onPageChange={() => {}} />
        </>
      )}
    </div>
  )
}
