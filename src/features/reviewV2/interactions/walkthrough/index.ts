import { aggregateWalkthroughResult } from '@/domain/grading/walkthrough'
import type { InteractionDefinition } from '../types'
import { initialWalkthroughState, type WalkthroughState } from './state'
import { WalkthroughView } from './WalkthroughView'

export const walkthroughDefinition: InteractionDefinition<'walkthrough'> = {
  type: 'walkthrough',
  interactive: true,
  isResponseReady: (response, interaction) => {
    const state = (response as WalkthroughState | undefined) ?? initialWalkthroughState
    return interaction.steps.every((s) => s.id in state.answers)
  },
  // Returns null (not {correct:false}) when every step is self-graded
  // recall - "nothing objective to grade" is a distinct case from "graded
  // and wrong". See the shell fix in ReviewSessionScreen.primaryAction that
  // makes this distinction survive instead of being coerced away.
  autoGrade: (interaction, response) => {
    const state = (response as WalkthroughState | undefined) ?? initialWalkthroughState
    return aggregateWalkthroughResult(interaction, state.results)
  },
  View: WalkthroughView,
}
