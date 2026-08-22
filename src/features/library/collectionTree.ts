// Mostly a compatibility shim: Collection derivation moved to
// packages/core/src/library/collectionTree.ts and is published as @itera/core,
// so the web and a future native Library cannot derive two different trees from
// the same Deck.parentId data.
//
// The two functions below did not move and are the exception. They serialize a
// LibrarySelection into a browser query string, which is a web routing concern
// Expo Router replaces rather than reuses, and `URLSearchParams` is not typed
// under core's DOM-free compilation - declaring a global for it would weaken
// the one mechanism that enforces platform neutrality. The `LibrarySelection`
// type itself comes from core, so there is still one definition of what a
// selection is; only its URL encoding is web-local.
import type { LibrarySelection } from '@itera/core'

export {
  buildCollectionTree,
  collectionDeckCount,
  collectionIdFor,
  collectionPathFor,
  deriveCollections,
  getSelectionLabel,
  getSubtreeCollectionIds,
  subtreeCollectionIds,
  // The browsable Library decks. Core exports the deck-tree function directly;
  // this module used to carry a one-line delegation of the same name.
  leafDecks,
} from '@itera/core'

export type { CollectionNode, LibraryCollection, LibrarySelection } from '@itera/core'

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
