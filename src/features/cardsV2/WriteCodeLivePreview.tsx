import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { initialSchedulingState } from '@/domain/scheduling/state'
import {
  writeCodeFormToPreviewCard,
  type WriteCodeFormState,
} from '@/domain/cardsV2/writeCodeForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// The editor's live preview: the *actual* production Write Code interaction
// component, not a fake mockup — same ReviewSessionScreen + registry Review
// uses, rebuilt from the current form on every render (no separate fake Card
// representation). Non-committing: schedulingBefore is always a fresh
// baseline and onExit is a no-op.
//
// Like MultipleChoiceLivePreview, ReviewSessionScreen only resets its internal
// phase/response state on remount, so this keys on an explicit resetKey
// counter rather than form content: normal edits (typing in the starter code
// or an accepted answer) update the live card without discarding an
// in-progress submission, and "Reset preview" is the only thing that remounts
// back to the unanswered state.
export function WriteCodeLivePreview({ form }: { form: WriteCodeFormState }) {
  const [resetKey, setResetKey] = useState(0)
  const card = writeCodeFormToPreviewCard(form, 'preview')

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
        definition={getInteractionDefinition('write_code')}
        current={1}
        total={1}
        onExit={() => {}}
        schedulingBefore={initialSchedulingState()}
      />
    </IteraSurface>
  )
}
