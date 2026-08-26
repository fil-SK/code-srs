import { ProgressScreen } from '@/src/components/progress/ProgressScreen'
import { demoProgressViewModel } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

export default function ProgressRoute() {
  const { entities, now } = useDemoScreen()
  return <ProgressScreen viewModel={demoProgressViewModel(entities, now)} />
}
