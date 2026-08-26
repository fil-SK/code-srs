import {
  usePersistReviewResult,
  useUndoGrade,
  type Card,
  type CardInteraction,
  type ID,
  type SchedulingState,
  type SubmitReviewResult,
} from '@itera/core'
import { useState } from 'react'

import { createDemoQueue } from '@/src/demo/demoQueue'
import type { DemoEntities } from '@/src/demo/demoEntities'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'
import { ReviewSessionScreen } from './ReviewSessionScreen'
import { SessionCompleteScreen } from './SessionCompleteScreen'
import { nativeInteractionFor } from './interactions/registry'

// One local demo study session, start to finish.
//
// It owns the queue snapshot, the position in it, and enough per-card history
// to undo the last grade. Everything that decides an outcome is shared: the
// queue is built from the repository's real scheduling, the grade comes from
// reviewService, and the resulting SchedulingState and ReviewLog are written
// through the same shared hooks web uses - usePersistReviewResult, which calls
// repo.commitReview, and useUndoGrade, which calls repo.revertReview.
//
// The two stores therefore move together or not at all, and the invalidations
// that follow are the ones Today, Library and Progress already subscribe to.
// This used to call two demo-only context setters that mutated a workspace
// object directly; the semantics were the same, but they were a second way to
// record a review, on the platform least allowed to have one.
//
// The queue is snapshotted once, at mount. Grading a card changes its due date,
// so a live query would drop the card out from under the learner mid-session -
// the same reason web's useSessionQueue is a per-mount snapshot.
//
// Nothing here is persisted. The repository behind those hooks is in memory, so
// demo review state still resets on a full app restart, which is this mode's
// documented intent.

export interface GradedCardRecord {
  cardId: ID
  /** The card's scheduling before the grade, kept so Undo restores rather than recomputes. */
  before: SchedulingState
  /** The card as it stood before the grade, which is what Undo restores verbatim. */
  card: Card
  logId: ID
  rating: number
}

export function DemoReviewSession({
  deckId,
  entities,
  onExit,
}: {
  deckId?: ID
  entities: DemoEntities
  onExit: () => void
}) {
  const { now } = useDemoWorkspace()
  const persist = usePersistReviewResult()
  const undo = useUndoGrade()

  // Built once. `now` and the entities are read at mount and deliberately not
  // tracked afterwards.
  const [queue] = useState(() => createDemoQueue(entities, { now, deckId }))
  const [index, setIndex] = useState(0)
  const [graded, setGraded] = useState<GradedCardRecord[]>([])

  const card = queue[index]

  if (!card) {
    return (
      <SessionCompleteScreen
        graded={graded}
        onExit={onExit}
        onUndo={
          graded.length === 0
            ? undefined
            : () => {
                const last = graded[graded.length - 1]
                // The recorded pre-grade card, restored verbatim. The scheduler
                // is not run backwards, because FSRS is not invertible.
                undo.mutate({ card: last.card, logId: last.logId })
                setGraded((current) => current.slice(0, -1))
                setIndex((current) => Math.max(0, current - 1))
              }
        }
        total={queue.length}
      />
    )
  }

  const definition = nativeInteractionFor(card.interaction.type)

  // Awaited before the session advances, the rule web's ReviewSessionV2 follows:
  // a write that has not committed must not move the queue on or enter the undo
  // stack. A demo write cannot fail, so there is no persist-failure surface here
  // - the await is what makes adding one a change to this function rather than a
  // change to the session's shape.
  async function handleGraded(result: SubmitReviewResult) {
    await persist.mutateAsync({ card, after: result.after, log: result.log })
    setGraded((current) => [
      ...current,
      {
        cardId: result.log.cardId,
        before: card.scheduling,
        card,
        logId: result.log.id,
        rating: result.log.rating,
      },
    ])
    setIndex((current) => current + 1)
  }

  return (
    <ReviewSessionScreen
      // Remounting per card is what resets phase, response and timing - the same
      // rule web follows. Keyed on the card, never on the queue length.
      key={card.id}
      card={
        card as Card & {
          interaction: Extract<CardInteraction, { type: typeof card.interaction.type }>
        }
      }
      current={index + 1}
      definition={definition}
      onExit={onExit}
      onGraded={handleGraded}
      schedulingBefore={card.scheduling}
      total={queue.length}
    />
  )
}
