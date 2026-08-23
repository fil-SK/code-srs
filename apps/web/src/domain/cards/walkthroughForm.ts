// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/cards/walkthroughForm.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional.

export {
  addWalkthroughAcceptedAnswer,
  addWalkthroughMcOption,
  addWalkthroughRange,
  addWalkthroughStep,
  cardRecordToWalkthroughForm,
  emptyWalkthroughForm,
  moveWalkthroughMcOption,
  moveWalkthroughStep,
  removeWalkthroughAcceptedAnswer,
  removeWalkthroughMcOption,
  removeWalkthroughRange,
  removeWalkthroughStep,
  renameWalkthroughMcOption,
  setWalkthroughMcSelectionMode,
  setWalkthroughStepResponseType,
  toggleWalkthroughMcOptionCorrect,
  updateWalkthroughAcceptedAnswer,
  updateWalkthroughRange,
  updateWalkthroughRecallAnswer,
  updateWalkthroughStepExplanation,
  updateWalkthroughStepPrompt,
  updateWalkthroughStepTip,
  validateWalkthroughForm,
  walkthroughFormToPreviewCard,
  walkthroughFormToRecord,
} from '@itera/core'

export type {
  WalkthroughAcceptedAnswerFormState,
  WalkthroughEnvelope,
  WalkthroughFormState,
  WalkthroughRangeFormState,
  WalkthroughStepFormState,
  WalkthroughStepResponseType,
  WalkthroughValidation,
} from '@itera/core'
