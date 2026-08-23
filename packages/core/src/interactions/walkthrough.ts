import { aggregateWalkthroughResult } from '../domain/grading/walkthrough'
import type { InteractionBehavior } from './types'
import { initialWalkthroughState, type WalkthroughState } from './walkthroughState'

export const walkthroughBehavior = {
  type: 'walkthrough',
  interactive: true,
  // Every step answered. The View's own Continue/Finish enablement reads this
  // same function rather than re-deriving it, so an early card-level submit
  // can't finish the card before the last step is answered.
  isResponseReady: (response, interaction) => {
    const state = (response as WalkthroughState | undefined) ?? initialWalkthroughState
    return interaction.steps.every((s) => s.id in state.answers)
  },
  // Returns null (not {correct:false}) when every step is self-graded
  // recall - "nothing objective to grade" is a distinct case from "graded
  // and wrong", and the review shell keeps that distinction rather than
  // coercing it away.
  autoGrade: (interaction, response) => {
    const state = (response as WalkthroughState | undefined) ?? initialWalkthroughState
    return aggregateWalkthroughResult(interaction, state.results)
  },
} satisfies InteractionBehavior<'walkthrough'>
