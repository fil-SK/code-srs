import {
  multipleChoiceFormToPreviewCard,
  type MultipleChoiceFormState,
} from '@/domain/cardsV2/multipleChoiceForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { InteractionAnswerPreview } from './shared/InteractionAnswerPreview'

// The editor's live preview: the *actual* production Multiple Choice
// interaction component, not a fake mockup — rendered through
// InteractionAnswerPreview, a simplified stand-in for ReviewSessionScreen
// with no session chrome, just a Question/Answer toggle (see
// docs/itera-decisions.md and that component's own doc comment). Read-only
// (InteractionAnswerPreview sets hideActions, which MultipleChoiceView also
// uses to force `locked`) — nothing to reset, unlike the old
// ReviewSessionScreen-backed version.
export function MultipleChoiceLivePreview({ form }: { form: MultipleChoiceFormState }) {
  const card = multipleChoiceFormToPreviewCard(form, 'preview')

  return (
    <InteractionAnswerPreview card={card} definition={getInteractionDefinition('multiple_choice')} />
  )
}
