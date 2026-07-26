import type { ReactNode } from 'react'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { LibraryTopNav } from './LibraryTopNav'
import { CollectionNav, type LibrarySelection } from './CollectionNav'
import type { LibraryCollection, LibraryDeck } from './fixtures'
import { useIsWideLibrary } from './useIsWideLibrary'

// Like PreviewShell (design-preview/PreviewShell.tsx) but at Today's
// container width (max-w-[1280px], not max-w-3xl) since a two-pane dense
// browser needs the room, and with LibraryTopNav instead of no nav at all —
// requirement #3 asks Library to reuse Today's shared shell, not just its
// tokens. No "not part of the live app" banner (unlike PreviewShell) — product
// call, not carried over here. Collapses Collection nav + content to a single
// stacked column below ~880px (useIsWideLibrary), rendering the nav as a
// horizontal scrollable row instead of the vertical tree at that width.
export function LibraryPreviewShell({
  collections,
  decks,
  selection,
  onSelect,
  children,
}: {
  collections: LibraryCollection[]
  decks: LibraryDeck[]
  selection: LibrarySelection
  onSelect: (selection: LibrarySelection) => void
  children: ReactNode
}) {
  const isWide = useIsWideLibrary()

  return (
    <IteraSurface className="min-h-screen">
      <LibraryTopNav />

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        {isWide ? (
          <div className="grid grid-cols-[220px_1fr] items-start gap-8">
            <CollectionNav
              collections={collections}
              decks={decks}
              selection={selection}
              onSelect={onSelect}
            />
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <CollectionNav
              collections={collections}
              decks={decks}
              selection={selection}
              onSelect={onSelect}
              compact
            />
            <div className="min-w-0">{children}</div>
          </div>
        )}
      </main>
    </IteraSurface>
  )
}
