// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/cards/orderingForm.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export {
  cardRecordToOrderingForm,
  emptyOrderingForm,
  orderingFormToPreviewCard,
  orderingFormToRecord,
  validateOrderingForm,
} from '@fliptap/core'

export type {
  OrderingEnvelope,
  OrderingFormState,
  OrderingItemFormState,
  OrderingValidation,
} from '@fliptap/core'
