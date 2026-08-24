import { RecallPreviewScreen } from '@/src/components/review/RecallPreviewScreen'
import { mobileRecallPreviewFixture } from '@/src/fixtures/reviewRecall'

export default function ReviewRoute() {
  return <RecallPreviewScreen viewModel={mobileRecallPreviewFixture} />
}
