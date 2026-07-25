import type { ComponentType } from 'react'
import type { CardInteraction, CardV2, InteractionType } from '@/types/cardV2'
import type { ObjectiveResult, ReviewPhase } from '../reviewPhase'

// The response shape is interaction-specific (string[] of option ids for
// Multiple Choice, a code string for Write Code, nothing for Recall) — kept
// as `unknown` at this boundary, same as v1's CardResponse, narrowed inside
// each interaction's own View/grading functions.
export type InteractionResponse = unknown

export interface InteractionViewProps<T extends InteractionType> {
  card: CardV2 & { interaction: Extract<CardInteraction, { type: T }> }
  phase: ReviewPhase
  response: InteractionResponse
  setResponse: (response: InteractionResponse) => void
  // The single "reveal or submit" trigger, owned by the shell (so keyboard
  // and click/button paths always go through the same guarded logic). Used
  // directly by Recall's click-to-flip; wired to a "Submit answer" button by
  // interactive types. A no-op once phase is no longer 'presenting'.
  onPrimaryAction: () => void
  responseReady: boolean
}

// Everything needed to render and (if auto-graded) grade one interaction
// type. Mirrors the v1 CardTypeDefinition's shape deliberately — same
// registry philosophy, adapted for the phase-driven v2 shell. One View
// component (not separate Presenting/Feedback components) because a
// self-graded type like Recall needs one continuous element across the
// reveal — swapping components at that boundary would break the flip
// animation.
export interface InteractionDefinition<T extends InteractionType> {
  type: T
  // false = self-graded (reveal via Space, rate yourself). true = the
  // learner builds a response and submits it (Enter), then it's auto-graded.
  interactive: boolean
  isResponseReady?: (
    response: InteractionResponse,
    interaction: Extract<CardInteraction, { type: T }>,
  ) => boolean
  autoGrade?: (
    interaction: Extract<CardInteraction, { type: T }>,
    response: InteractionResponse,
  ) => ObjectiveResult | null
  View: ComponentType<InteractionViewProps<T>>
}
