import type { ReactNode } from 'react'
import { CollectionNav, type NavDeck } from './CollectionNav'
import { CollectionNavDrawer } from './CollectionNavDrawer'
import { LibraryTip } from './LibraryTip'
import { useIsWideLibrary } from './useIsWideLibrary'
import type { LibraryCollection, LibrarySelection } from '../collectionTree'

// The Library page's own local Collection-navigation panel (locked IA §3:
// "The Library may contain its own local Collection-navigation panel inside
// the page content" — not global chrome, unlike TopNav/AppShell). Collapses
// Collection nav + content to a single stacked column below ~880px
// (useIsWideLibrary), swapping the vertical tree for CollectionNavDrawer's
// drill-down drawer at that width. Shared by both the Library browser and
// the focused Deck page, so the tree (and the active-deck highlight) is
// consistent chrome across both, not something only the browser page has.
export function LibraryShell({
  collections,
  decks,
  selection,
  activeDeckId,
  onSelect,
  children,
}: {
  collections: LibraryCollection[]
  decks: NavDeck[]
  selection: LibrarySelection
  activeDeckId?: string
  onSelect: (selection: LibrarySelection) => void
  children: ReactNode
}) {
  const isWide = useIsWideLibrary()

  return isWide ? (
    <div className="grid grid-cols-[220px_1fr] items-start gap-8">
      <div>
        <CollectionNav
          collections={collections}
          decks={decks}
          selection={selection}
          activeDeckId={activeDeckId}
          onSelect={onSelect}
        />
        <LibraryTip />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <CollectionNavDrawer
        collections={collections}
        decks={decks}
        selection={selection}
        activeDeckId={activeDeckId}
        onSelect={onSelect}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
