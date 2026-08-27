import { useLocalSearchParams, useRouter } from 'expo-router'

import { DeckFormScreen } from '@/src/components/cards/DeckFormScreen'
import { findDemoDeck } from '@/src/demo/demoSelectors'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// New Deck, reached from All Decks (no parent) and from a Collection (that
// collection as the parent).
//
// A collection IS a deck, so "inside collection X" is `parentId: X.id` and
// nothing else - there is no collectionId field, and the rail, All Decks and
// the deck caption all derive membership from that one relationship.
//
// A parentId naming no deck is treated as no parent rather than as an error:
// the deck is still created, at the top level, which is the honest outcome of
// an unresolvable scope on a create screen.
export default function NewDeckRoute() {
  const router = useRouter()
  const { parentId } = useLocalSearchParams<{ parentId?: string }>()
  const { entities } = useDemoScreen()
  const parent = findDemoDeck(entities, parentId) ?? undefined

  return (
    <DeckFormScreen
      onCancel={() => (router.canGoBack() ? router.back() : router.replace('/library'))}
      onSaved={(deck) =>
        // Replace rather than push, so the form leaves the stack and Back from
        // the new deck returns to the list it was created from.
        router.replace({ pathname: '/deck/[deckId]', params: { deckId: deck.id } })
      }
      target={{ kind: 'create', parent }}
    />
  )
}
