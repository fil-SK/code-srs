import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { Deck } from '@/types'
import { fieldClass, selectClass } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useCreateDeck, useDecks, useDeleteDeck, useSaveDeck } from '@/hooks/useDecks'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useSearchCardsV2 } from '@/hooks/useCardsV2'
import {
  collectionIdFor,
  deriveCollections,
  getSubtreeCollectionIds,
  leafDecks,
  selectionFromSearchParams,
  type LibrarySelection,
} from './collectionTree'
import { computeDeckMetrics, metricsFor } from './deckMetrics'
import { LibraryShell } from './shared/LibraryShell'
import { EmptyState } from './shared/EmptyState'
import { DeckRow, DeckTableHeader } from './DeckRow'
import { FilterMenu } from './FilterMenu'

type SortKey = 'name' | 'due' | 'lastStudied' | 'cardCount'

// The default Library destination (/decks). Replaces DecksPage's flat/nested
// tree browser with the redesigned Collection-nav + Deck-list layout,
// promoted from design-preview/library-browser — same visual system, wired
// to real Deck/Card data instead of fixtures. Collections are UI-only,
// derived from Deck.parentId (see collectionTree.ts) — no schema change.
export function LibraryBrowserPage() {
  const now = useMemo(() => Date.now(), [])
  const [searchParams] = useSearchParams()
  const [selection, setSelection] = useState<LibrarySelection>(() =>
    selectionFromSearchParams(searchParams),
  )
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [dueOnly, setDueOnly] = useState(false)

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

  const scoped = useMemo(() => {
    if (selection.kind === 'all') return leaves
    if (selection.kind === 'unfiled') return leaves.filter((d) => !collectionIdFor(d, collections))
    const ids = getSubtreeCollectionIds(collections, selection.id)
    return leaves.filter((d) => {
      const cid = collectionIdFor(d, collections)
      return cid && ids.includes(cid)
    })
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

  function newDeck() {
    const name = window.prompt('New deck name')?.trim()
    if (name) createDeck.mutate({ name })
  }

  function rename(deck: Deck) {
    const name = window.prompt('Deck name', deck.name)?.trim()
    if (name && name !== deck.name) saveDeck.mutate({ ...deck, name })
  }

  function remove(deck: Deck, cardCount: number) {
    if (cardCount > 0) {
      window.alert(`“${deck.name}” has ${cardCount} card${cardCount === 1 ? '' : 's'}. Move or delete them first.`)
      return
    }
    if (window.confirm(`Delete deck “${deck.name}”?`)) deleteDeck.mutate(deck.id)
  }

  return (
    <LibraryShell
      collections={collections}
      decks={navDecks}
      selection={selection}
      onSelect={setSelection}
      onCreateDeck={newDeck}
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-itera-display text-2xl font-bold tracking-tight text-itera-ink-brand">
          Library
        </h1>
        <Button variant="primary" onClick={newDeck}>
          + New Deck
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
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
        <FilterMenu dueOnly={dueOnly} onDueOnlyChange={setDueOnly} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={`${selectClass} w-auto`}
        >
          <option value="name">Sort: Name</option>
          <option value="lastStudied">Sort: Last studied</option>
          <option value="due">Sort: Due count</option>
          <option value="cardCount">Sort: Card count</option>
        </select>
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
        <EmptyState title="This collection is empty" description="No decks have been added to this collection yet." />
      ) : (
        <div className="overflow-x-auto rounded-itera-card border border-itera-border bg-itera-surface px-4">
          <DeckTableHeader />
          <div className="divide-y divide-itera-border">
            {filtered.map((deck) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                metrics={metricsFor(metrics, deck.id)}
                now={now}
                onRename={rename}
                onDelete={remove}
              />
            ))}
          </div>
        </div>
      )}
    </LibraryShell>
  )
}

function sortDecks(decks: Deck[], sort: SortKey, metrics: ReturnType<typeof computeDeckMetrics>): Deck[] {
  const copy = [...decks]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case 'due':
      return copy.sort((a, b) => metricsFor(metrics, b.id).dueCount - metricsFor(metrics, a.id).dueCount)
    case 'lastStudied':
      return copy.sort(
        (a, b) => (metricsFor(metrics, b.id).lastStudied ?? 0) - (metricsFor(metrics, a.id).lastStudied ?? 0),
      )
    case 'cardCount':
      return copy.sort((a, b) => metricsFor(metrics, b.id).cardCount - metricsFor(metrics, a.id).cardCount)
  }
}
