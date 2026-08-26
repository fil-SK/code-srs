import { Redirect, useLocalSearchParams } from 'expo-router'

import { LibraryDeckScreen } from '@/src/components/library/LibraryDeckScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { demoCollections, demoDeckViewModel } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// The route parameter is resolved, not ignored. This route used to hand deckId
// to a factory that returned the same deck for every value.
export default function LibraryDeckRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  const { entities, now, isLoading } = useDemoScreen()

  // A deck with children is a Collection, and a Collection has its own screen.
  // Nothing in the app produces this link today - every deck row is a leaf - but
  // a collection id and a deck id come from the same id space now, so the case
  // is reachable by hand and by a future authored hierarchy. Web makes the same
  // redirect for the same reason: the alternative is an accurate but useless
  // empty deck page for something that is not a deck.
  if (demoCollections(entities).some((collection) => collection.id === deckId)) {
    return <Redirect href={{ pathname: '/library/[collectionId]', params: { collectionId: deckId } }} />
  }

  const viewModel = demoDeckViewModel(entities, deckId, now)

  if (!viewModel) {
    // Not "missing" until the decks have been read at least once.
    if (isLoading) return null
    return (
      <LibraryNotFoundScreen
        detail="This link points at a deck that no longer exists."
        title="Deck not found"
      />
    )
  }

  return <LibraryDeckScreen viewModel={viewModel} />
}
