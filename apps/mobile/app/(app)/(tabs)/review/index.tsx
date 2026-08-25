import { useRouter } from 'expo-router'

import { ReviewStartScreen } from '@/src/components/review/ReviewStartScreen'
import { createDemoQueue, demoQueueDeckNames } from '@/src/demo/demoQueue'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// The Review tab lands here, not inside a card. Starting a session is an
// explicit action, and the caught-up case has somewhere to be stated.
export default function ReviewStartRoute() {
  const router = useRouter()
  const { workspace, now } = useDemoWorkspace()
  const queue = createDemoQueue(workspace, { now })

  return (
    <ReviewStartScreen
      deckNames={demoQueueDeckNames(workspace, queue)}
      dueCount={queue.length}
      onStart={() => router.push('/review/session')}
    />
  )
}
