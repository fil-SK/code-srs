import { useLocalSearchParams } from 'expo-router'

import { LibraryCollectionScreen } from '@/src/components/library/LibraryCollectionScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { demoCollectionViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// The route parameter is resolved, not ignored. An id that names no scope gets
// a not-found state rather than some other collection's contents.
export default function LibraryCollectionRoute() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>()
  const { workspace, now } = useDemoWorkspace()
  const viewModel = demoCollectionViewModel(workspace, collectionId, now)

  if (!viewModel) {
    return (
      <LibraryNotFoundScreen
        detail="This link points at a collection that is not part of the demo workspace."
        title="Collection not found"
      />
    )
  }

  return <LibraryCollectionScreen viewModel={viewModel} />
}
