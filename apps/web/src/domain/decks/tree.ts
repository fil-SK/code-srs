// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/decks/tree.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export {
  buildDeckTree,
  descendantIds,
  flattenDeckTree,
  leafDecks,
  parentDeckIds,
  subtreeIds,
} from '@fliptap/core'

export type { DeckNode, FlatDeck } from '@fliptap/core'
