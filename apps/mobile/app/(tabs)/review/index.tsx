import { WalkthroughPreviewScreen } from '@/src/components/review/WalkthroughPreviewScreen'
import { mobileWalkthroughPreviewFixture } from '@/src/fixtures/reviewWalkthrough'

export default function WalkthroughPreviewRoute() {
  return <WalkthroughPreviewScreen viewModel={mobileWalkthroughPreviewFixture} />
}
