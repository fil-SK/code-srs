import { initialSchedulingState } from '@/domain/scheduling/state'
import { recallFormToPreviewCard, type RecallFormState } from '@/domain/cardsV2/recallForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// The editor's live preview: the *actual* production Recall interaction
// component (spec §22.1/§22.6/§35.3), not a fake mockup — same
// ReviewSessionScreen + registry Review uses. Non-committing: schedulingBefore
// is always a fresh baseline and onGraded/onExit are no-ops, since nothing
// here is ever persisted as a real review.
//
// Keyed on the authoring preset (not on every keystroke of `form`) so typing
// in the editor updates the preview's content live without resetting an
// in-progress flip; switching presets does reset it, which reads as
// intentional since the preset is a different worked example.
export function RecallLivePreview({ form }: { form: RecallFormState }) {
  const card = recallFormToPreviewCard(form, 'preview')

  return (
    <IteraSurface>
      <ReviewSessionScreen
        key={form.authoringPreset}
        card={card}
        definition={getInteractionDefinition('recall')}
        current={1}
        total={1}
        onExit={() => {}}
        schedulingBefore={initialSchedulingState()}
      />
    </IteraSurface>
  )
}
