import type { ComponentType } from 'react'
import type {
  Card,
  CardInteraction,
  InteractionBehavior,
  InteractionResponse,
  InteractionType,
} from '@itera/core'
import type { ReviewPhase } from '../reviewPhase'

// Re-exported so the existing `from './interactions/types'` imports still
// resolve to core's one definition rather than a web copy.
export type { InteractionResponse }

// The web View's prop bag. Deliberately *not* in @itera/core: this is the
// contract between the review shell and a React DOM component, including a
// web-authoring affordance (`hideActions`), and a native View will want its
// own event signatures over the same learning state. What is shared is the
// behavior (@itera/core's InteractionBehavior), not the rendering contract.
export interface InteractionViewProps<T extends InteractionType> {
  card: Card & { interaction: Extract<CardInteraction, { type: T }> }
  phase: ReviewPhase
  response: InteractionResponse
  setResponse: (response: InteractionResponse) => void
  // The single "reveal or submit" trigger, owned by the shell (so keyboard
  // and click/button paths always go through the same guarded logic). Used
  // directly by Recall's click-to-flip; wired to a "Submit answer" button by
  // interactive types. A no-op once phase is no longer 'presenting'.
  onPrimaryAction: () => void
  responseReady: boolean
  // Optional, default false. Set by InteractionAnswerPreview (the card
  // editor's simplified authoring preview — see docs/itera-decisions.md) so
  // an interactive type's own "Submit answer" button doesn't render there:
  // that preview drives `phase` directly from a plain Question/Answer
  // toggle rather than a real attempt, so there is nothing to submit. Real
  // Review (ReviewSessionScreen) never sets this — every existing caller is
  // unaffected.
  hideActions?: boolean
}

// The web binding: one shared behavior plus this platform's View. The
// behavior half is spread in from @itera/core and never restated here, so
// readiness, grading and semantic width exist exactly once for web and for
// whatever binds the same objects next.
//
// One View component (not separate Presenting/Feedback components) because a
// self-graded type like Recall needs one continuous element across the
// reveal — swapping components at that boundary would break the flip
// animation.
export interface WebInteractionDefinition<T extends InteractionType>
  extends InteractionBehavior<T> {
  View: ComponentType<InteractionViewProps<T>>
}
