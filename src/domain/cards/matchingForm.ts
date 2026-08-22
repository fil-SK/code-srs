// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/cards/matchingForm.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
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
} from '@itera/core'

export type {
  MatchingColumnFormState,
  MatchingEnvelope,
  MatchingFormState,
  MatchingOptionFormState,
  MatchingRowFormState,
  MatchingValidation,
} from '@itera/core'
