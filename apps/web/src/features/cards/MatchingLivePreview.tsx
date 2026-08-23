import {
  matchingFormToPreviewCard,
  type MatchingFormState,
} from '@/domain/cards/matchingForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { InteractionAnswerPreview } from './shared/InteractionAnswerPreview'

// The editor's live preview: the *actual* production Matching interaction
// component, not a fake mockup — rendered through InteractionAnswerPreview,
// a simplified stand-in for ReviewSessionScreen with no session chrome, just
// a Question/Answer toggle (see docs/itera-decisions.md and that
// component's own doc comment). Read-only — nothing to reset.
export function MatchingLivePreview({ form }: { form: MatchingFormState }) {
  const card = matchingFormToPreviewCard(form, 'preview')

  return <InteractionAnswerPreview card={card} definition={getInteractionDefinition('matching')} />
}
