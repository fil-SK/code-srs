import { WriteCodePreviewScreen } from '@/src/components/review/WriteCodePreviewScreen'
import { mobileWriteCodePreviewFixture } from '@/src/fixtures/reviewWriteCode'

export default function WriteCodePreviewRoute() {
  return <WriteCodePreviewScreen viewModel={mobileWriteCodePreviewFixture} />
}
