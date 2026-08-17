import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Upload } from 'lucide-react'
import type { Deck } from '@/types'
import { fieldClass } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useDialogs } from '@/components/ui/dialogs'
import { useCreateDeck, useDecks, useDeleteDeck, useSaveDeck } from '@/hooks/useDecks'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useSearchCardsV2 } from '@/hooks/useCardsV2'
import {
  collectionIdFor,
  deriveCollections,
  leafDecks,
  selectionFromSearchParams,
  type LibrarySelection,
} from './collectionTree'
import { computeDeckMetrics, metricsFor } from './deckMetrics'
import { LibraryShell } from './shared/LibraryShell'
import { RowFilterDropdown } from './shared/RowFilterDropdown'
import { EmptyState } from './shared/EmptyState'
import { DeckRow, DeckTableHeader } from './DeckRow'
import { FilterMenu } from './FilterMenu'
import { LibraryCollectionView } from './LibraryCollectionView'
import { sortDecks, type DeckSortKey } from './shared/sortDecks'
import { CardListFooter } from './shared/CardListFooter'

const ALL_DECKS_PAGE_SIZE = 10

// The default Library destination (/decks). Replaced the pre-Itera flat/nested
// deck-tree browser with the redesigned Collection-nav + Deck-list layout,
// promoted out of a fixture preview and wired to real Deck/Card data (the
// preview it came from has since been deleted). Collections are UI-only,
// derived from Deck.parentId (see collectionTree.ts) — no schema change.
export function LibraryBrowserPage() {
  const dialogs = useDialogs()
  const now = useMemo(() => Date.now(), [])
  const [searchParams] = useSearchParams()
  const [selection, setSelection] = useState<LibrarySelection>(() =>
    selectionFromSearchParams(searchParams),
  )
  const [search, setSearch] = useState('')
  const [allDecksSort, setAllDecksSort] = useState<DeckSortKey>('lastStudied')
  const [otherSort, setOtherSort] = useState<DeckSortKey>('name')
  const [dueOnly, setDueOnly] = useState(false)
  const [page, setPage] = useState(1)
  const isAllDecks = selection.kind === 'all'
  const sort = isAllDecks ? allDecksSort : otherSort

  const decksQuery = useDecks()
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCards = useDueCards({ now })
  const allCardsV2 = useSearchCardsV2({ includeSuspended: true })

  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()
  const deleteDeck = useDeleteDeck()

  const collections = useMemo(() => deriveCollections(decksQuery.data ?? []), [decksQuery.data])
  const leaves = useMemo(() => leafDecks(decksQuery.data ?? []), [decksQuery.data])

  const v2CountByDeck = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of allCardsV2.data ?? []) map.set(c.deckId, (map.get(c.deckId) ?? 0) + 1)
    return map
  }, [allCardsV2.data])

  const metrics = useMemo(
    () => computeDeckMetrics(allCards.data ?? [], dueCards.data ?? [], v2CountByDeck),
    [allCards.data, dueCards.data, v2CountByDeck],
  )

  const navDecks = useMemo(
    () =>
      leaves.map((d) => ({
        id: d.id,
        name: d.name,
        collectionId: collectionIdFor(d, collections),
        cardCount: metricsFor(metrics, d.id).cardCount,
      })),
    [leaves, collections, metrics],
  )

  // A specific Collection selection renders LibraryCollectionView instead
  // (below) - that view scopes and paginates its own leaf-descendant list
  // independently. This root composition only ever needs "all" or "unfiled".
  const scoped = useMemo(() => {
    if (selection.kind === 'unfiled') return leaves.filter((d) => !collectionIdFor(d, collections))
    return leaves
  }, [collections, leaves, selection])

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ALL_DECKS_PAGE_SIZE))
  const visibleDecks = isAllDecks
    ? filtered.slice((page - 1) * ALL_DECKS_PAGE_SIZE, page * ALL_DECKS_PAGE_SIZE)
    : filtered

  useEffect(() => setPage(1), [search, sort, dueOnly, selection])
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages])

  async function newDeck() {
    const name = await dialogs.prompt({
      title: 'New deck',
      label: 'Deck name',
      placeholder: 'e.g. Templates',
      confirmLabel: 'Create deck',
    })
    if (name) createDeck.mutate({ name })
  }

  async function rename(deck: Deck) {
    const name = await dialogs.prompt({
      title: 'Rename deck',
      label: 'Deck name',
      initialValue: deck.name,
      confirmLabel: 'Rename',
    })
    if (name && name !== deck.name) saveDeck.mutate({ ...deck, name })
  }

  async function remove(deck: Deck, cardCount: number) {
    if (cardCount > 0) {
      await dialogs.alert({
        title: `“${deck.name}” isn’t empty`,
        description: `It still has ${cardCount} card${cardCount === 1 ? '' : 's'}. Move or delete them first.`,
      })
      return
    }
    const ok = await dialogs.confirm({
      title: 'Delete this deck?',
      description: `“${deck.name}” will be removed permanently. This cannot be undone.`,
      danger: true,
    })
    if (ok) deleteDeck.mutate(deck.id)
  }

  return (
    <LibraryShell
      collections={collections}
      decks={navDecks}
      selection={selection}
      onSelect={setSelection}
      onCreateDeck={newDeck}
    >
      {selection.kind === 'collection' ? (
        <LibraryCollectionView
          collectionId={selection.id}
          decks={decksQuery.data ?? []}
          collections={collections}
          metrics={metrics}
          now={now}
          onSelect={setSelection}
        />
      ) : (
        <>
          {isAllDecks ? (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-5 border-b border-itera-border pb-5">
              <div>
                <h1 className="font-itera-display text-3xl font-bold tracking-tight text-itera-ink-brand">
                  All Decks
                </h1>
                <p className="mt-1.5 text-sm text-itera-muted">View and manage all your decks.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={newDeck}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-itera-control bg-itera-accent px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-95"
                >
                  <Plus size={18} strokeWidth={1.8} /> New Deck
                </button>
                <Link
                  to="/settings/import-export"
                  title="Open Itera JSON import"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-itera-control border border-itera-border-strong bg-itera-surface px-5 text-sm font-semibold text-itera-ink-brand transition-colors hover:border-itera-accent hover:text-itera-accent"
                >
                  <Upload size={17} strokeWidth={1.8} /> Import Deck
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between">
              <h1 className="font-itera-display text-2xl font-bold tracking-tight text-itera-ink-brand">
                Library
              </h1>
              <Button variant="primary" onClick={newDeck}>
                + New Deck
              </Button>
            </div>
          )}

          <div
            className={
              isAllDecks
                ? 'mb-6 flex flex-wrap items-center justify-between gap-4'
                : 'mb-4 flex flex-wrap items-center gap-3'
            }
          >
            <div
              className={
                isAllDecks
                  ? 'relative w-full max-w-[376px] flex-none'
                  : 'relative min-w-[220px] flex-1'
              }
            >
              <Search
                size={isAllDecks ? 18 : 15}
                strokeWidth={isAllDecks ? 1.8 : 2}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-itera-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search decks..."
                className={`${fieldClass} ${isAllDecks ? 'h-11 bg-itera-surface pl-11' : 'pl-9'}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <FilterMenu
                dueOnly={dueOnly}
                onDueOnlyChange={setDueOnly}
                referenceStyle={isAllDecks}
              />
              <RowFilterDropdown
                label="Sort"
                value={sort}
                onChange={(v) => {
                  if (isAllDecks) setAllDecksSort(v as DeckSortKey)
                  else setOtherSort(v as DeckSortKey)
                }}
                showValueWhenDefault
                wide={isAllDecks}
                options={[
                  { value: 'lastStudied', label: 'Last studied' },
                  { value: 'name', label: 'Name' },
                  { value: 'due', label: 'Due soon' },
                  { value: 'cardCount', label: 'Card count' },
                ]}
              />
            </div>
          </div>

          {leaves.length === 0 ? (
            <EmptyState
              title="No decks yet"
              description="Create one (and nest subdecks inside it), or just make a card — an “Inbox” deck is created automatically."
              action={
                <Button variant="primary" onClick={newDeck}>
                  + New Deck
                </Button>
              }
            />
          ) : filtered.length === 0 && search.trim() ? (
            <EmptyState
              title="No decks match your search"
              description={`Nothing found for "${search.trim()}".`}
              action={
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              }
            />
          ) : scoped.length === 0 ? (
            <EmptyState title="No unfiled decks" description="Every deck currently belongs to a collection." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className={isAllDecks ? 'px-3' : 'px-5'}>
                  <DeckTableHeader allDecks={isAllDecks} />
                </div>
                <div
                  className={
                    isAllDecks
                      ? 'rounded-itera-card border border-itera-border bg-itera-surface px-3'
                      : 'rounded-itera-card border border-itera-border bg-itera-surface px-4'
                  }
                >
                  <div className="divide-y divide-itera-border">
                    {visibleDecks.map((deck) => (
                      <DeckRow
                        key={deck.id}
                        deck={deck}
                        metrics={metricsFor(metrics, deck.id)}
                        now={now}
                        onRename={rename}
                        onDelete={remove}
                        allDecks={isAllDecks}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {isAllDecks && (
                <CardListFooter
                  count={filtered.length}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemLabel="deck"
                  showTip={false}
                  pageSize={ALL_DECKS_PAGE_SIZE}
                />
              )}
            </>
          )}
        </>
      )}
    </LibraryShell>
  )
}
