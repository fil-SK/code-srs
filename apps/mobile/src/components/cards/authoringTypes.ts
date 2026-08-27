import type { InteractionType } from '@itera/core'

// The interaction types this platform can currently author.
//
// One list, consulted by both the Add Card chooser and the card row's Edit
// action, so the chooser and the edit affordance cannot disagree about what is
// buildable. M-PARITY-1B ships Recall and Multiple Choice; M-PARITY-2 and
// M-PARITY-3 add the other four by extending this array and adding the matching
// editor screen.
//
// A type that is not in this list is not offered anywhere - not as a disabled
// row, not as an Edit action that opens nothing. Existing cards of every one of
// the six types remain fully reviewable and studyable; the limit is authoring
// only, and nothing labels those cards as broken.
export const AUTHORABLE_INTERACTION_TYPES = ['recall', 'multiple_choice'] as const

export type AuthorableInteractionType = (typeof AUTHORABLE_INTERACTION_TYPES)[number]

export function isAuthorableInteraction(type: InteractionType): type is AuthorableInteractionType {
  return (AUTHORABLE_INTERACTION_TYPES as readonly InteractionType[]).includes(type)
}

export const AUTHORABLE_INTERACTION_LABELS: Record<AuthorableInteractionType, string> = {
  recall: 'Recall',
  multiple_choice: 'Multiple Choice',
}

export const AUTHORABLE_INTERACTION_DESCRIPTIONS: Record<AuthorableInteractionType, string> = {
  recall: 'A prompt and the answer it reveals.',
  multiple_choice: 'Options, one or more of them correct.',
}
