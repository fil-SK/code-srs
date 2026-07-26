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
