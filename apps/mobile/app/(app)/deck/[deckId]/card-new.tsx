import { useLocalSearchParams, useRouter } from 'expo-router'

import { isAuthorableInteraction } from '@/src/components/cards/authoringTypes'
import { MultipleChoiceEditorScreen } from '@/src/components/cards/MultipleChoiceEditorScreen'
import { RecallEditorScreen } from '@/src/components/cards/RecallEditorScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { findDemoDeck } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// Create a card in a deck. The interaction type arrives as a parameter from the
// deck's type chooser, and is checked against the authorable set rather than
// trusted: a hand-typed link naming an editor that does not exist yet gets a
// not-found state instead of a blank screen.
export default function NewCardRoute() {
  const router = useRouter()
  const { deckId, type } = useLocalSearchParams<{ deckId: string; type: string }>()
  const { entities, isLoading } = useDemoScreen()
  const deck = findDemoDeck(entities, deckId)

  const authorable =
    type === 'recall' || type === 'multiple_choice'
      ? isAuthorableInteraction(type)
        ? type
        : null
      : null

  if (!deck || !authorable) {
    if (isLoading) return null
    return (
      <LibraryNotFoundScreen
        detail={
          deck
            ? 'That card type cannot be authored on this device yet.'
            : 'This link points at a deck that no longer exists.'
        }
        title={deck ? 'Editor not available' : 'Deck not found'}
      />
    )
  }

  const goBack = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/library/deck/[deckId]', params: { deckId: deck.id } })

  const props = { deckId: deck.id, deckName: deck.name, onCancel: goBack, onSaved: goBack }

  return authorable === 'recall' ? (
    <RecallEditorScreen {...props} />
  ) : (
    <MultipleChoiceEditorScreen {...props} />
  )
}
