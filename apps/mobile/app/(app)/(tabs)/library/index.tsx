import { LibraryAllDecksScreen } from '@/src/components/library/LibraryAllDecksScreen'
import { demoLibraryViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

export default function LibraryRoute() {
  const { workspace, now } = useDemoWorkspace()
  return <LibraryAllDecksScreen viewModel={demoLibraryViewModel(workspace, now)} />
}
