import { useRouter } from 'expo-router'

import { ReviewStartScreen } from '@/src/components/review/ReviewStartScreen'
import { createDemoQueue, demoQueueDeckNames } from '@/src/demo/demoQueue'
import { useDemoScreen } from '@/src/demo/useDemoScreen'

// The Review tab lands here, not inside a card. Starting a session is an
// explicit action, and the caught-up case has somewhere to be stated.
export default function ReviewStartRoute() {
  const router = useRouter()
  const { entities, now } = useDemoScreen()
  const queue = createDemoQueue(entities, { now })

  return (
    <ReviewStartScreen
      deckNames={demoQueueDeckNames(entities, queue)}
      dueCount={queue.length}
      onStart={() => router.push('/review/session')}
    />
  )
}
