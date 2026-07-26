import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { CollectionNav, type LibrarySelection } from './CollectionNav'
import { getSelectionLabel } from './collectionTree'
import type { LibraryCollection, LibraryDeck } from './fixtures'

// Narrow-width (<880px, see useIsWideLibrary) replacement for the vertical
// Collection tree: a trigger bar showing the current scope, opening a
// slide-in drawer with the full, un-flattened tree (nesting/indentation
// preserved) — per the brief and master-spec §29.1's "drill-down or drawer"
// requirement. Replaces the old horizontal-tab-row fallback, which flattened
// nesting away entirely (see docs/itera-decisions.md D58, superseded here).
export function CollectionNavDrawer({
  collections,
  decks,
  selection,
  onSelect,
}: {
  collections: LibraryCollection[]
  decks: LibraryDeck[]
  selection: LibrarySelection
  onSelect: (selection: LibrarySelection) => void
}) {
  const [open, setOpen] = useState(false)
  const label = getSelectionLabel(selection, collections)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-itera-control border border-itera-border bg-itera-surface px-3.5 py-2.5 text-sm"
      >
        <span className="text-itera-muted">
          Collection: <span className="font-semibold text-itera-ink-brand">{label}</span>
        </span>
        <ChevronDown size={15} className="text-itera-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Collections">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-[300px] flex-col bg-itera-surface p-4 shadow-[var(--itera-shadow-float)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-itera-ink-brand">Collections</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CollectionNav
                collections={collections}
                decks={decks}
                selection={selection}
                onSelect={(next) => {
                  onSelect(next)
                  setOpen(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
