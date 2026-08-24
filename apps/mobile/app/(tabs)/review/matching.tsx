import { MatchingPreviewScreen } from '@/src/components/review/MatchingPreviewScreen'
import { mobileMatchingPreviewFixture } from '@/src/fixtures/reviewMatching'

export default function MatchingPreviewRoute() {
  return <MatchingPreviewScreen viewModel={mobileMatchingPreviewFixture} />
}
