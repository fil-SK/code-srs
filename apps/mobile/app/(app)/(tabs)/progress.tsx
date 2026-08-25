import { ProgressScreen } from '@/src/components/progress/ProgressScreen'
import { demoProgressViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

export default function ProgressRoute() {
  const { workspace, now } = useDemoWorkspace()
  return <ProgressScreen viewModel={demoProgressViewModel(workspace, now)} />
}
