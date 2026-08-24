import { MultipleChoicePreviewScreen } from '@/src/components/review/MultipleChoicePreviewScreen'
import { mobileMultipleChoicePreviewFixture } from '@/src/fixtures/reviewMultipleChoice'

export default function MultipleChoicePreviewRoute() {
  return <MultipleChoicePreviewScreen viewModel={mobileMultipleChoicePreviewFixture} />
}
