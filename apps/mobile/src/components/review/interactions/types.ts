import type {
  Card,
  CardInteraction,
  InteractionBehavior,
  InteractionResponse,
  InteractionType,
} from '@itera/core'
import type { ComponentType } from 'react'

import type { ReviewPhase } from '../reviewPhase'

// The native binding of a shared interaction behavior to a native View.
//
// The mirror image of web's WebInteractionDefinition. Core owns `interactive`,
// `isResponseReady`, `autoGrade` and the semantic `widthFor`; each platform
// adds only the component that draws them. Nothing in this workspace may
// re-implement any of the four - registry.test.ts asserts the binding holds by
// reference, so a hand-written copy of a behavior fails the build rather than
// quietly diverging from web.

export interface NativeInteractionViewProps<T extends InteractionType> {
  card: Card & { interaction: Extract<CardInteraction, { type: T }> }
  phase: ReviewPhase
  response: InteractionResponse
  setResponse: (response: InteractionResponse) => void
  /** Reveal (self-graded) or submit (auto-graded). The host decides which. */
  onPrimaryAction: () => void
  responseReady: boolean
  /**
   * Locks the session's scroll view while a View owns a vertical gesture.
   * Native-only, and native-only on purpose: a drag inside a scroll view
   * competes with the scroll for the same gesture, which is not a problem the
   * web Views have and not a concept core should learn. Only Ordering uses it.
   */
  setScrollEnabled: (enabled: boolean) => void
}

export type NativeInteractionDefinition<T extends InteractionType> = InteractionBehavior<T> & {
  View: ComponentType<NativeInteractionViewProps<T>>
}
