import { useLocalSearchParams, useRouter } from 'expo-router'

import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { CardStudyScreen } from '@/src/components/review/CardStudyScreen'
import { findDemoCard } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// The card study preview, the native equivalent of web's cards/:id/study.
//
// It lives at the (app) stack level rather than inside the tabs, for the same
// reason /notifications does: it is a pushed detail surface, so it gets the
// native push transition and the iOS back-swipe, the deck underneath stays
// mounted with its search and filter intact, and an immersive card surface is
// not drawn behind a tab bar.
//
// The route parameter is resolved by lookup. An id that names no demo card gets
// an honest not-found state rather than some other card.
export default function CardStudyRoute() {
  const router = useRouter()
  const { cardId } = useLocalSearchParams<{ cardId: string }>()
  const { workspace } = useDemoWorkspace()
  const card = findDemoCard(workspace, cardId)

  if (!card) {
    return (
      <LibraryNotFoundScreen
        detail="This link points at a card that is not part of the demo workspace."
        title="Card not found"
      />
    )
  }

  return (
    <CardStudyScreen
      card={card}
      // Back to whatever pushed the preview, which is the deck the card is in.
      onExit={() => (router.canGoBack() ? router.back() : router.replace('/library'))}
    />
  )
}
