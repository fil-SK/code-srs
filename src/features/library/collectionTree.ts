import type { Deck, ID } from '@/types'

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
  const parentIds = new Set(decks.map((d) => d.parentId).filter((id): id is string => !!id))
  return decks
    .filter((d) => parentIds.has(d.id))
    .map((d) => ({
      id: d.id,
      name: d.name,
      parentId: d.parentId && parentIds.has(d.parentId) ? d.parentId : undefined,
    }))
}

// The actual browsable Library decks: leaves of the deck tree (no children).
export function leafDecks(decks: Deck[]): Deck[] {
  const parentIds = new Set(decks.map((d) => d.parentId).filter((id): id is string => !!id))
  return decks.filter((d) => !parentIds.has(d.id))
}

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

export function getSelectionLabel(
  selection: LibrarySelection,
  collections: LibraryCollection[],
): string {
  if (selection.kind === 'all') return 'All Decks'
  if (selection.kind === 'unfiled') return 'Unfiled Decks'
  return collections.find((c) => c.id === selection.id)?.name ?? 'All Decks'
}

// Round-trips a LibrarySelection through a URL query string so navigating
// from the focused Deck page's Collection nav/breadcrumb back to the browser
// can land pre-scoped to the collection that was actually clicked.
export function selectionToSearchParams(selection: LibrarySelection): URLSearchParams {
  const params = new URLSearchParams()
  if (selection.kind === 'unfiled') params.set('scope', 'unfiled')
  else if (selection.kind === 'collection') params.set('collection', selection.id)
  return params
}

export function selectionFromSearchParams(params: URLSearchParams): LibrarySelection {
  const collectionId = params.get('collection')
  if (collectionId) return { kind: 'collection', id: collectionId }
  if (params.get('scope') === 'unfiled') return { kind: 'unfiled' }
  return { kind: 'all' }
}
