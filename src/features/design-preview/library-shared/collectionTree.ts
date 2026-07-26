import type { LibraryCollection, LibraryDeck } from './fixtures'

export type LibrarySelection =
  | { kind: 'all' }
  | { kind: 'unfiled' }
  | { kind: 'collection'; id: string }

export interface CollectionNode {
  collection: LibraryCollection
  depth: number
  children: CollectionNode[]
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

export function collectionDeckCount(collectionIds: string[], decks: LibraryDeck[]): number {
  return decks.filter((d) => d.collectionId && collectionIds.includes(d.collectionId)).length
}

// Used by LibraryBrowserPreviewPage/LibraryDeckPreviewPage to filter decks
// to a selected collection's own decks plus its descendants' — matches
// DecksPage.tsx's existing subtree-rollup convention.
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

// Shared by the narrow-width drawer trigger and LibraryBrowserPreviewPage's
// page heading — one implementation instead of two copies computing the same
// label from a LibrarySelection.
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
// can land pre-scoped to the collection that was actually clicked, instead
// of always resetting to "All Decks".
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
