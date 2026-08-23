// Compatibility shim - see ./index.ts. Canonical definitions live in
// packages/core/src/types/card.ts.
//
// Two statements because `verbatimModuleSyntax` will not let a type and a
// value share one export clause: CARD_SCHEMA_VERSION and richText are the only
// runtime values in the type layer, and callers import them from here today.
export type {
  AuthoringPreset,
  Card,
  CardInteraction,
  InteractionType,
  MatchingColumn,
  MatchingColumnItem,
  MatchingInteraction,
  McOption,
  MultipleChoiceInteraction,
  OrderingInteraction,
  OrderingItemV2,
  RecallInteraction,
  RichContent,
  WalkthroughInteraction,
  WalkthroughStep,
  WalkthroughStepResponse,
  WriteCodeInteraction,
} from '@itera/core'

export { CARD_SCHEMA_VERSION, richText } from '@itera/core'
