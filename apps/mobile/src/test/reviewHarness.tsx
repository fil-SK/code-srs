import type { Card, CardInteraction, InteractionType, SubmitReviewResult } from '@itera/core'
import { act, render } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import { ReviewSessionScreen } from '@/src/components/review/ReviewSessionScreen'
import { nativeInteractionFor } from '@/src/components/review/interactions/registry'
import { createDemoSeed } from '@/src/demo/demoWorkspace'

/**
 * Test support for the native Review session. Not a `*.test.tsx` file, so the
 * runner does not execute it, and under `src/` rather than `app/`, where Expo
 * Router's require.context would pull it into the bundle (itera-decisions D356).
 */

/** One fixed instant, so seeded due dates and FSRS previews are reproducible. */
export const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)

/** The seeded dataset, as a plain entity value. */
export const demoEntities = createDemoSeed(NOW)

export function demoCardOfType(type: InteractionType): Card {
  const card = demoEntities.cards.find((entry) => entry.interaction.type === type)
  if (!card) throw new Error(`The demo workspace has no ${type} card.`)
  return card
}

/**
 * Reduce Motion on by default.
 *
 * Deliberately not named use*: it registers a beforeEach, it is not a React
 * hook, and the hooks lint rule is right to object to one being called at a
 * module's top level.
 *
 * Two Views (Recall, Matching) reveal through an Animated.timing whose
 * completion callback drives the phase change. Under the test renderer that
 * callback is not guaranteed to run, so the reduced-motion path - which is a
 * real code path a real learner uses - is what these tests exercise.
 */
export function mockReducedMotion(): void {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: () => {} } as ReturnType<typeof AccessibilityInfo.addEventListener>)
  })
}

/** Lets the reduce-motion probe and any other mount effect settle. */
export async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

export interface RenderedCard {
  graded: SubmitReviewResult[]
  exits: number
}

/**
 * Renders one card through the real session shell, with the real registry
 * binding, and records what it grades.
 */
export async function renderCard(card: Card, { total = 3, current = 1 } = {}) {
  const recorded: RenderedCard = { graded: [], exits: 0 }
  const definition = nativeInteractionFor(card.interaction.type)

  const view = render(
    <ReviewSessionScreen
      card={
        card as Card & {
          interaction: Extract<CardInteraction, { type: typeof card.interaction.type }>
        }
      }
      current={current}
      definition={definition}
      onExit={() => {
        recorded.exits += 1
      }}
      onGraded={(result) => {
        recorded.graded.push(result)
      }}
      schedulingBefore={card.scheduling}
      total={total}
    />,
  )

  await settle()
  return { ...view, recorded }
}
