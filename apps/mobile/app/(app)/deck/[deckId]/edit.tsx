import { useLocalSearchParams, useRouter } from 'expo-router'

import { DeckFormScreen } from '@/src/components/cards/DeckFormScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { findDemoDeck } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// Edit a deck's name and description. The route parameter is resolved by
// lookup, like every other id-bearing route here, so an id that names no deck
// gets an honest not-found state rather than an empty form that would create
// something on save.
export default function EditDeckRoute() {
  const router = useRouter()
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  const { entities, isLoading } = useDemoScreen()
  const deck = findDemoDeck(entities, deckId)

  if (!deck) {
    if (isLoading) return null
    return (
      <LibraryNotFoundScreen
        detail="This link points at a deck that no longer exists."
        title="Deck not found"
      />
    )
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/library'))

  return <DeckFormScreen onCancel={goBack} onSaved={goBack} target={{ kind: 'edit', deck }} />
}
