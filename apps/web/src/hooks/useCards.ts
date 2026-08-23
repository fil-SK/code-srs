// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/hooks/ and is published as @itera/core.
//
// It exists so moving the data hooks into the shared package did not have to be
// the same commit as rewriting every feature's imports. New code should import
// from '@itera/core' directly; this layer is transitional.
//
// The six Save*CardTarget types come from '@itera/core' too: core's hook module
// no longer re-exports them, since the barrel already carries them from
// domain/cards/save*Card.

export {
  useCard,
  useCreateCard,
  useDeleteCard,
  useDueCards,
  useMoveCard,
  useReorderCards,
  useSaveCard,
  useSaveMatchingCard,
  useSaveMultipleChoiceCard,
  useSaveOrderingCard,
  useSaveRecallCard,
  useSaveWalkthroughCard,
  useSaveWriteCodeCard,
  useSearchCards,
} from '@itera/core'
export type {
  SaveMatchingCardTarget,
  SaveMultipleChoiceCardTarget,
  SaveOrderingCardTarget,
  SaveRecallCardTarget,
  SaveWalkthroughCardTarget,
  SaveWriteCodeCardTarget,
} from '@itera/core'
