import { ProgressScreen } from '@/src/components/progress/ProgressScreen'
import { mobileProgressFixture } from '@/src/fixtures/progress'

export default function ProgressRoute() {
  return <ProgressScreen viewModel={mobileProgressFixture} />
}
