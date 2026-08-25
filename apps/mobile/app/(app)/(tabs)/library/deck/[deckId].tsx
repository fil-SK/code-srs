import { useLocalSearchParams } from 'expo-router'

import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { demoDeckViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// The route parameter is resolved, not ignored. This route used to hand deckId
// to a factory that returned the same deck for every value.
export default function LibraryDeckRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  const { workspace, now } = useDemoWorkspace()
  const viewModel = demoDeckViewModel(workspace, deckId, now)

  if (!viewModel) {
    return (
      <LibraryNotFoundScreen
        detail="This link points at a deck that no longer exists."
        title="Deck not found"
      />
    )
  }

  return <LibraryDeckScreen viewModel={viewModel} />
}
