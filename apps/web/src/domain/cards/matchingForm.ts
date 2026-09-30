// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/cards/matchingForm.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export {
  MAX_MATCHING_VALUE_COLUMNS,
  addMatchingColumn,
  addMatchingOption,
  addMatchingRow,
  cardRecordToMatchingForm,
  emptyMatchingForm,
  matchingFormToPreviewCard,
  matchingFormToRecord,
  moveMatchingRow,
  removeMatchingColumn,
  removeMatchingOption,
  removeMatchingRow,
  renameMatchingOption,
  setColumnFixed,
  updateMatchingColumnLabel,
  updateMatchingRowCell,
  updateMatchingRowSource,
  validateMatchingForm,
} from '@fliptap/core'

export type {
  MatchingColumnFormState,
  MatchingEnvelope,
  MatchingFormState,
  MatchingOptionFormState,
  MatchingRowFormState,
  MatchingValidation,
} from '@fliptap/core'
