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
// drill-down drawer at that width. Shared by both the Library browser and
// the focused Deck page, so the tree (and the active-deck highlight) is
// consistent chrome across both, not something only the browser page has.
// `items-stretch` (not `items-start`) so the sidebar column matches the
// content column's height, letting CollectionNav's Settings row pin to the
// bottom via `mt-auto` instead of sitting right under the tree.
export function LibraryShell({
  collections,
  decks,
  selection,
  activeDeckId,
  onSelect,
  onCreateDeck,
  children,
}: {
  collections: LibraryCollection[]
  decks: NavDeck[]
  selection: LibrarySelection
  activeDeckId?: string
  onSelect: (selection: LibrarySelection) => void
  onCreateDeck?: () => void
  children: ReactNode
}) {
  const isWide = useIsWideLibrary()

  return isWide ? (
    <div className="grid grid-cols-[264px_1fr] items-stretch">
      <div className="border-r border-itera-border bg-itera-surface pr-6">
        <CollectionNav
          collections={collections}
          decks={decks}
          selection={selection}
          activeDeckId={activeDeckId}
          onSelect={onSelect}
          onCreateDeck={onCreateDeck}
        />
      </div>
      <div className="min-w-0 pl-8">{children}</div>
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
