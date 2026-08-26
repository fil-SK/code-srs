import { useLocalSearchParams } from 'expo-router'

import { LibraryCollectionScreen } from '@/src/components/library/LibraryCollectionScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { demoCollectionViewModel } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// The route parameter is resolved, not ignored. An id that names no scope gets
// a not-found state rather than some other collection's contents.
export default function LibraryCollectionRoute() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>()
  const { entities, now, isLoading } = useDemoScreen()
  const viewModel = demoCollectionViewModel(entities, collectionId, now)

  // A scope cannot be judged missing until the decks have actually been read.
  // Without this, the first frame of every collection route would claim the
  // collection does not exist.
  if (!viewModel) {
    if (isLoading) return null
    return (
      <LibraryNotFoundScreen
        detail="This link points at a collection that no longer exists."
        title="Collection not found"
      />
    )
  }

  return <LibraryCollectionScreen viewModel={viewModel} />
}
