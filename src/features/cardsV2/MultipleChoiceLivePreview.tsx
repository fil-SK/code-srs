import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { initialSchedulingState } from '@/domain/scheduling/state'
import {
  multipleChoiceFormToPreviewCard,
  type MultipleChoiceFormState,
} from '@/domain/cardsV2/multipleChoiceForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// The editor's live preview: the *actual* production Multiple Choice
// interaction component, not a fake mockup — same ReviewSessionScreen +
// registry Review uses. Non-committing: schedulingBefore is always a fresh
// baseline and onExit is a no-op.
//
// Unlike RecallLivePreview (which resets by switching authoringPreset, a
// field Multiple Choice has no equivalent of), ReviewSessionScreen only
// resets its internal phase/response state on remount — so this keys on an
// explicit resetKey counter, not on form content: normal edits (typing,
// adding an option) update the live card without discarding an in-progress
// selection, and "Reset preview" is the only thing that remounts back to the
// unanswered state.
export function MultipleChoiceLivePreview({ form }: { form: MultipleChoiceFormState }) {
  const [resetKey, setResetKey] = useState(0)
  const card = multipleChoiceFormToPreviewCard(form, 'preview')

  return (
    <IteraSurface>
      <div className="mb-3 flex justify-end">
        <Button type="button" variant="ghost" onClick={() => setResetKey((k) => k + 1)}>
          Reset preview
        </Button>
      </div>
      <ReviewSessionScreen
        key={resetKey}
        card={card}
        definition={getInteractionDefinition('multiple_choice')}
        current={1}
        total={1}
        onExit={() => {}}
        schedulingBefore={initialSchedulingState()}
      />
    </IteraSurface>
  )
}
