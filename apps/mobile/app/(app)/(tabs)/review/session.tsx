import { useLocalSearchParams, useRouter } from 'expo-router'

import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'

// The immersive session. The tab bar hides while this route is focused; see
// IteraTabBar.
//
// `deckId` carries the same scoping semantics web puts behind `?deck=`.
export default function ReviewSessionRoute() {
  const router = useRouter()
  const { deckId } = useLocalSearchParams<{ deckId?: string }>()

  return (
    <DemoReviewSession
      deckId={deckId}
      // Back to wherever the session was entered from - the Review tab, Today,
      // or a deck - rather than unconditionally to Today.
      onExit={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
    />
  )
}
