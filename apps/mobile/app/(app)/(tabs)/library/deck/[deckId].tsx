import { useLocalSearchParams } from 'expo-router'

import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { createMobileDeckFixture } from '@/src/fixtures/library'

export default function LibraryDeckRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  return <LibraryDeckScreen viewModel={createMobileDeckFixture(deckId)} />
}
