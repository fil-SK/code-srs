import { PreviewShell } from '@/features/design-preview/PreviewShell'
import { recallFixture } from '@/features/design-preview/fixtures'
import { RecallCardDemo } from './RecallCardDemo'

export function RecallPreviewPage() {
  return (
    <PreviewShell>
      <RecallCardDemo card={recallFixture} />
    </PreviewShell>
  )
}
