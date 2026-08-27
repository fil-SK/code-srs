import { useLocalSearchParams, useRouter } from 'expo-router'

import { MultipleChoiceEditorScreen } from '@/src/components/cards/MultipleChoiceEditorScreen'
import { RecallEditorScreen } from '@/src/components/cards/RecallEditorScreen'
import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { findDemoCard, findDemoDeck } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// Edit one card, dispatched on its own interaction type - the same shape web's
// card edit entry has, narrowed to the two types this platform can currently
// author. Nothing routes here for the other four (the card row offers Edit only
// for an authorable type), and a hand-typed link to one says so rather than
// rendering an editor that would lose the card's content.
//
// The card record is handed to the editor whole, so the shared save path can
// carry its id, createdAt, suspended flag, manual order and entire scheduling
// state through the edit untouched. Review history for that id stays attached
// because the id does.
export default function EditCardRoute() {
  const router = useRouter()
  const { cardId } = useLocalSearchParams<{ cardId: string }>()
  const { entities, isLoading } = useDemoScreen()
  const card = findDemoCard(entities, cardId)
  const deck = card ? findDemoDeck(entities, card.deckId) : null

  if (!card) {
    if (isLoading) return null
    return (
      <LibraryNotFoundScreen
        detail="This link points at a card that no longer exists."
        title="Card not found"
      />
    )
  }

  if (card.interaction.type !== 'recall' && card.interaction.type !== 'multiple_choice') {
    return (
      <LibraryNotFoundScreen
        detail="This card type can be edited on the web app. It reviews and studies normally here."
        title="Editor not available"
      />
    )
  }

  const goBack = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/deck/[deckId]', params: { deckId: card.deckId } })

  const props = {
    card,
    deckId: card.deckId,
    deckName: deck?.name ?? '',
    onCancel: goBack,
    onSaved: goBack,
  }

  return card.interaction.type === 'recall' ? (
    <RecallEditorScreen {...props} />
  ) : (
    <MultipleChoiceEditorScreen {...props} />
  )
}
