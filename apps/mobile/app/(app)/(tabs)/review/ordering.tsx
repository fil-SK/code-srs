import { OrderingPreviewScreen } from '@/src/components/review/OrderingPreviewScreen'
import { mobileOrderingPreviewFixture } from '@/src/fixtures/reviewOrdering'

export default function OrderingPreviewRoute() {
  return <OrderingPreviewScreen viewModel={mobileOrderingPreviewFixture} />
}
