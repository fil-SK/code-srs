// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/hooks/ and is published as @fliptap/core.
//
// It exists so moving the data hooks into the shared package did not have to be
// the same commit as rewriting every feature's imports. New code should import
// from '@fliptap/core' directly; this layer is transitional.

export { useCreateDeck, useDecks, useDeleteDeck, useSaveDeck } from '@fliptap/core'
export type { NewDeckInput } from '@fliptap/core'
