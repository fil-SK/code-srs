import { recallFormToPreviewCard, type RecallFormState } from '@/domain/cardsV2/recallForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { InteractionAnswerPreview } from './shared/InteractionAnswerPreview'

// The editor's live preview: the *actual* production Recall interaction
// component (spec §22.1/§22.6/§35.3), not a fake mockup — rendered through
// InteractionAnswerPreview, a simplified stand-in for ReviewSessionScreen
// with no session chrome (Exit/counter/hint/rating), just a Question/Answer
// toggle (see docs/itera-decisions.md and that component's own doc comment).
//
// Keyed on the authoring preset (not on every keystroke of `form`) so typing
// in the editor updates the preview's content live without resetting an
// in-progress flip; switching presets does reset it, which reads as
// intentional since the preset is a different worked example.
export function RecallLivePreview({ form }: { form: RecallFormState }) {
  const card = recallFormToPreviewCard(form, 'preview')

  return (
    <InteractionAnswerPreview
      key={form.authoringPreset}
      card={card}
      definition={getInteractionDefinition('recall')}
    />
  )
}
