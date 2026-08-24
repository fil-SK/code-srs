import { useLocalSearchParams } from 'expo-router'

import { LibraryCollectionScreen } from '@/src/components/library/LibraryCollectionScreen'
import { createMobileCollectionFixture } from '@/src/fixtures/library'

export default function LibraryCollectionRoute() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>()
  return <LibraryCollectionScreen viewModel={createMobileCollectionFixture(collectionId)} />
}
