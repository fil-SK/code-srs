import { useNavigate } from 'react-router-dom'
import { PreviewShell } from '@/features/design-preview/PreviewShell'
import { multipleChoiceFixture } from '@/features/design-preview/fixtures'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'

export function MultipleChoicePreviewPage() {
  const navigate = useNavigate()
  return (
    <PreviewShell>
      <ReviewSessionScreen
        key={multipleChoiceFixture.id}
        card={multipleChoiceFixture}
        definition={getInteractionDefinition('multiple_choice')}
        current={1}
        total={1}
        onExit={() => navigate('/design-preview')}
        schedulingBefore={initialSchedulingState()}
      />
    </PreviewShell>
  )
}
