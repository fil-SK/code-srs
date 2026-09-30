// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/cards/multipleChoiceForm.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export {
  cardRecordToMultipleChoiceForm,
  emptyMultipleChoiceForm,
  multipleChoiceFormToPreviewCard,
  multipleChoiceFormToRecord,
  validateMultipleChoiceForm,
} from '@fliptap/core'

export type {
  McOptionFormState,
  MultipleChoiceEnvelope,
  MultipleChoiceFormState,
  MultipleChoiceValidation,
} from '@fliptap/core'
