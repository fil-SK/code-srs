// Collection derivation over the existing Deck.parentId tree. Shared rather
// than web-only: a second, native derivation of "which decks are Collections"
// would give the two platforms two different Library trees for identical data.
//
// The URL-query round trip that used to live at the bottom of this file
// (selectionToSearchParams / selectionFromSearchParams) stayed in the web app.
// It serializes a LibrarySelection into a browser query string, which Expo
// Router replaces rather than reuses, and URLSearchParams is not typed under
// core's DOM-free compilation - declaring a global for it would weaken the one
// mechanism that enforces platform neutrality. The selection *type* is here, so
// there is still exactly one definition of what a selection is.
import type { Deck, ID } from '../types'
import { parentDeckIds } from '../domain/decks/tree'

export interface LibraryCollection {
  id: ID
  name: string
  parentId?: ID
}

export type LibrarySelection =
  | { kind: 'all' }
  | { kind: 'unfiled' }
  | { kind: 'collection'; id: string }

export interface CollectionNode {
  collection: LibraryCollection
  depth: number
  children: CollectionNode[]
}

// A "Collection" is UI-only (docs/itera-decisions.md D8): any deck with at
// least one child deck. Decks with no children are the actual browsable
// Library decks (see leafDecks below); a leaf deck's collection is its
// parent. No new type or persisted field — purely derived from the existing
// Deck.parentId tree, honoring the "no schema migration this milestone"
// constraint. Every ancestor of a deck-with-children is itself a
// deck-with-children (it has that deck as a descendant), so a collection's
// parentId always resolves to another collection or is absent (top-level).
export function deriveCollections(decks: Deck[]): LibraryCollection[] {
  const parentIds = parentDeckIds(decks)
  return decks
    .filter((d) => parentIds.has(d.id))
    .map((d) => ({
      id: d.id,
      name: d.name,
      parentId: d.parentId && parentIds.has(d.parentId) ? d.parentId : undefined,
    }))
}

// The actual browsable Library decks - leaves of the deck tree (no children) -
// are `leafDecks` from domain/decks/tree. This module used to re-export it
// through a one-line delegation of the same name; the package barrel exports
// the deck-tree function itself, so there is one implementation and one name.

// A leaf deck's collection is its parent, if any (always a valid collection
// per the invariant above).
export function collectionIdFor(deck: Deck, collections: LibraryCollection[]): string | undefined {
  return deck.parentId && collections.some((c) => c.id === deck.parentId) ? deck.parentId : undefined
}

export function buildCollectionTree(collections: LibraryCollection[]): CollectionNode[] {
  const byParent = new Map<string | undefined, LibraryCollection[]>()
  for (const c of collections) {
    const key = c.parentId
    byParent.set(key, [...(byParent.get(key) ?? []), c])
  }
  function build(parentId: string | undefined, depth: number): CollectionNode[] {
    return (byParent.get(parentId) ?? []).map((collection) => ({
      collection,
      depth,
      children: build(collection.id, depth + 1),
    }))
  }
  return build(undefined, 0)
}

export function subtreeCollectionIds(node: CollectionNode): string[] {
  return [node.collection.id, ...node.children.flatMap(subtreeCollectionIds)]
}

// Counts how many of `decks` fall under any of `collectionIds` — used by the
// Collection nav to show a deck count next to each collection.
export function collectionDeckCount(
  collectionIds: string[],
  decks: { collectionId?: ID }[],
): number {
  return decks.filter((d) => d.collectionId && collectionIds.includes(d.collectionId)).length
}

export function getSubtreeCollectionIds(collections: LibraryCollection[], rootId: string): string[] {
  const tree = buildCollectionTree(collections)
  function find(nodes: CollectionNode[]): CollectionNode | undefined {
    for (const n of nodes) {
      if (n.collection.id === rootId) return n
      const found = find(n.children)
      if (found) return found
    }
    return undefined
  }
  const node = find(tree)
  return node ? subtreeCollectionIds(node) : [rootId]
}

// Ancestor chain for a collection id, root-first — used by both the
// focused Deck page's breadcrumb and the Collection/container view's.
//
// Cycle-safe via the `seen` set, the same idiom subtreeIds uses. Deck.parentId
// is deliberately not validated referentially on import (src/data/backup.ts),
// so a hand-edited backup can carry a parent ring that the UI itself cannot
// create. Unguarded, that ring made this loop unshift forever and hang the tab
// (audit 2026-08-22). A repeated collection ends the walk, so the breadcrumb is
// truncated at the first repeat rather than duplicated or thrown away.
export function collectionPathFor(
  collections: LibraryCollection[],
  collectionId: string | undefined,
): LibraryCollection[] {
  if (!collectionId) return []
  const byId = new Map(collections.map((c) => [c.id, c]))
  const path: LibraryCollection[] = []
  const seen = new Set<string>()
  let current = byId.get(collectionId)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

export function getSelectionLabel(
  selection: LibrarySelection,
  collections: LibraryCollection[],
): string {
  if (selection.kind === 'all') return 'All Decks'
  if (selection.kind === 'unfiled') return 'Unfiled Decks'
  return collections.find((c) => c.id === selection.id)?.name ?? 'All Decks'
}
