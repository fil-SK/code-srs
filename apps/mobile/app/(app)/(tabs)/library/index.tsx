import { LibraryAllDecksScreen } from '@/src/components/library/LibraryAllDecksScreen'
import { demoLibraryViewModel } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

export default function LibraryRoute() {
  const { entities, now } = useDemoScreen()
  return <LibraryAllDecksScreen viewModel={demoLibraryViewModel(entities, now)} />
}
