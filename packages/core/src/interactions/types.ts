import type { CardInteraction, InteractionType } from '../types/card'
import type { ObjectiveResult } from '../domain/grading/types'

// The response shape is interaction-specific (string[] of option ids for
// Multiple Choice, a code string for Write Code, nothing for Recall) - kept
// as `unknown` at this boundary and narrowed inside each interaction's own
// behavior and View.
export type InteractionResponse = unknown

// Which surface class an interaction asks for, decided per card rather than
// per type. 'default' is whatever a platform considers its normal flashcard
// column; 'wide' says this card's own content cannot fit in it. Deliberately
// semantic: no rem, px or class name appears here, because each platform maps
// the intent onto its own layout (the web maps it to max-w-2xl/max-w-4xl in
// ReviewSessionScreen). Only Matching asks for 'wide', and only for a
// three-column board.
export type InteractionSurfaceWidth = 'default' | 'wide'

// What an interaction *means*: when a response counts as submittable, what a
// submitted response scores, and how much room the content needs. Everything
// here is platform-neutral by construction - it takes plain data and returns
// plain data, so the web and a future native app answer these questions
// identically instead of each re-deriving them.
//
// Rendering is not here on purpose. Each platform binds these behaviors to its
// own View (the web's WebInteractionDefinition adds `View: ComponentType<...>`),
// which is why this contract can live in a package with no DOM.
export interface InteractionBehavior<T extends InteractionType> {
  type: T
  // false = self-graded (reveal, then rate yourself). true = the learner builds
  // a response and submits it, then it is auto-graded.
  interactive: boolean
  isResponseReady?: (
    response: InteractionResponse,
    interaction: Extract<CardInteraction, { type: T }>,
  ) => boolean
  autoGrade?: (
    interaction: Extract<CardInteraction, { type: T }>,
    response: InteractionResponse,
  ) => ObjectiveResult | null
  widthFor?: (interaction: Extract<CardInteraction, { type: T }>) => InteractionSurfaceWidth
}
