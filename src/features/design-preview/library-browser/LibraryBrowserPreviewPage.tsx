import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { LibraryPreviewShell } from '../library-shared/LibraryPreviewShell'
import type { LibrarySelection } from '../library-shared/CollectionNav'
import { getSubtreeCollectionIds } from '../library-shared/collectionTree'
import { libraryCollections, libraryDecks, type LibraryDeck } from '../library-shared/fixtures'
import { EmptyState } from '../library-shared/EmptyState'
import { fieldClass, selectClass } from '@/components/ui/Field'
import { DeckRow } from './DeckRow'

type SortKey = 'name' | 'due' | 'lastStudied' | 'cardCount'

function sortDecks(decks: LibraryDeck[], sort: SortKey): LibraryDeck[] {
  const copy = [...decks]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case 'due':
      return copy.sort((a, b) => b.dueCount - a.dueCount)
    case 'lastStudied':
      return copy.sort((a, b) => (b.lastStudied ?? 0) - (a.lastStudied ?? 0))
    case 'cardCount':
      return copy.sort((a, b) => b.cardCount - a.cardCount)
  }
}

export function LibraryBrowserPreviewPage() {
  const now = useMemo(() => Date.now(), [])
  const [selection, setSelection] = useState<LibrarySelection>({ kind: 'all' })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [dueOnly, setDueOnly] = useState(false)

  const collectionName =
    selection.kind === 'collection'
      ? libraryCollections.find((c) => c.id === selection.id)?.name
      : undefined

  const scoped = useMemo(() => {
    if (selection.kind === 'all') return libraryDecks
    if (selection.kind === 'unfiled') return libraryDecks.filter((d) => !d.collectionId)
    const ids = getSubtreeCollectionIds(libraryCollections, selection.id)
    return libraryDecks.filter((d) => d.collectionId && ids.includes(d.collectionId))
  }, [selection])

  const filtered = useMemo(() => {
    let result = scoped
    if (dueOnly) result = result.filter((d) => d.dueCount > 0)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
      )
    }
    return sortDecks(result, sort)
  }, [scoped, search, sort, dueOnly])

  const scopeLabel =
    selection.kind === 'all' ? 'All Decks' : selection.kind === 'unfiled' ? 'Unfiled Decks' : collectionName

  return (
    <LibraryPreviewShell
      collections={libraryCollections}
      decks={libraryDecks}
      selection={selection}
      onSelect={setSelection}
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-itera-display text-2xl font-bold tracking-tight text-itera-ink-brand">
          {scopeLabel}
        </h1>
        <button
          type="button"
          className="inline-flex items-center rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white hover:brightness-105"
        >
          New Deck
        </button>
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
        <label className="flex items-center gap-1.5 text-sm text-itera-muted">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => setDueOnly(e.target.checked)}
            className="accent-itera-accent"
          />
          Due only
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={`${selectClass} w-auto`}
        >
          <option value="name">Sort: Name</option>
          <option value="due">Sort: Due count</option>
          <option value="lastStudied">Sort: Last studied</option>
          <option value="cardCount">Sort: Card count</option>
        </select>
      </div>

      {libraryDecks.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          description="Create your first deck to start building your collection."
          action={
            <button
              type="button"
              className="rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white hover:brightness-105"
            >
              New Deck
            </button>
          }
        />
      ) : filtered.length === 0 && search.trim() ? (
        <EmptyState
          title="No decks match your search"
          description={`Nothing found for "${search.trim()}".`}
          action={
            <button
              type="button"
              onClick={() => setSearch('')}
              className="rounded-itera-control border border-itera-border px-3.5 py-2 text-sm font-semibold text-itera-ink hover:border-itera-border-strong"
            >
              Clear search
            </button>
          }
        />
      ) : scoped.length === 0 ? (
        <EmptyState
          title="This collection is empty"
          description="No decks have been added to this collection yet."
        />
      ) : (
        <div className="divide-y divide-itera-border rounded-itera-card border border-itera-border bg-itera-surface px-5">
          {filtered.map((deck) => (
            <DeckRow key={deck.id} deck={deck} now={now} />
          ))}
        </div>
      )}
    </LibraryPreviewShell>
  )
}
