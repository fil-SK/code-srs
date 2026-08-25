import { useLocalSearchParams, useRouter } from 'expo-router'

import { LibraryNotFoundScreen } from '@/src/components/library/LibraryNotFoundScreen'
import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'
import { findDemoDeck } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// The immersive session. The tab bar hides while this route is focused; see
// IteraTabBar.
//
// `deckId` carries the same scoping semantics web puts behind `?deck=`: that
// deck and its subtree. A deckId that names no deck is refused here rather than
// handed to the queue, because the alternative - an empty queue, presented as
// the caught-up screen - would tell the learner they had finished a deck that
// does not exist. No deckId at all is the ordinary all-decks session.
export default function ReviewSessionRoute() {
  const router = useRouter()
  const { deckId } = useLocalSearchParams<{ deckId?: string }>()
  const { workspace } = useDemoWorkspace()

  if (deckId !== undefined && !findDemoDeck(workspace, deckId)) {
    return (
      <LibraryNotFoundScreen
        detail="This session was scoped to a deck that no longer exists."
        title="Deck not found"
      />
    )
  }

  return (
    <DemoReviewSession
      deckId={deckId}
      // Back to wherever the session was entered from - the Review tab, Today,
      // or a deck - rather than unconditionally to Today.
      onExit={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
    />
  )
}
