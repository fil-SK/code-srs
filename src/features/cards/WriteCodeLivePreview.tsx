import {
  writeCodeFormToPreviewCard,
  type WriteCodeFormState,
} from '@/domain/cards/writeCodeForm'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { InteractionAnswerPreview } from './shared/InteractionAnswerPreview'

// The editor's live preview: the *actual* production Write Code interaction
// component, not a fake mockup — rendered through InteractionAnswerPreview,
// a simplified stand-in for ReviewSessionScreen with no session chrome, just
// a Question/Answer toggle (see docs/itera-decisions.md and that
// component's own doc comment). Read-only — nothing to reset.
export function WriteCodeLivePreview({ form }: { form: WriteCodeFormState }) {
  const card = writeCodeFormToPreviewCard(form, 'preview')

  return <InteractionAnswerPreview card={card} definition={getInteractionDefinition('write_code')} />
}
