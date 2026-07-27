import type { ReactNode } from 'react'
import { CollectionNav, type NavDeck } from './CollectionNav'
import { CollectionNavDrawer } from './CollectionNavDrawer'
import { useIsWideLibrary } from './useIsWideLibrary'
import type { LibraryCollection, LibrarySelection } from '../collectionTree'

// The Library page's own local Collection-navigation panel (locked IA §3:
// "The Library may contain its own local Collection-navigation panel inside
// the page content" — not global chrome, unlike TopNav/AppShell). Collapses
// Collection nav + content to a single stacked column below ~880px
// (useIsWideLibrary), swapping the vertical tree for CollectionNavDrawer's
// drill-down drawer at that width.
export function LibraryShell({
  collections,
  decks,
  selection,
  onSelect,
  children,
}: {
  collections: LibraryCollection[]
  decks: NavDeck[]
  selection: LibrarySelection
  onSelect: (selection: LibrarySelection) => void
  children: ReactNode
}) {
  const isWide = useIsWideLibrary()

  return isWide ? (
    <div className="grid grid-cols-[220px_1fr] items-start gap-8">
      <CollectionNav collections={collections} decks={decks} selection={selection} onSelect={onSelect} />
      <div className="min-w-0">{children}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <CollectionNavDrawer collections={collections} decks={decks} selection={selection} onSelect={onSelect} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
