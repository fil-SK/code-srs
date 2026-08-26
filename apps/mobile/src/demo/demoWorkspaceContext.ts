import type { ID, Millis, SchedulingState, SubmitReviewResult } from '@itera/core'
import { createContext, useContext } from 'react'

import type { DemoWorkspace } from './demoWorkspace'

// The demo workspace context and its two accessors, kept apart from the
// provider component so neither file mixes components with plain exports.

export interface DemoWorkspaceValue {
  workspace: DemoWorkspace
  /**
   * The instant the whole tree compares due dates against. Advances with the
   * workspace, so every screen answers "is this due?" the same way - see the
   * provider.
   */
  now: Millis
  markNotificationRead: (id: string) => void
  markNotificationUnread: (id: string) => void
  markAllNotificationsRead: () => void
  /** Records one completed review: the new scheduling, and its ReviewLog. */
  applyDemoReview: (result: SubmitReviewResult) => void
  /** Reverses exactly one recorded review, from its own pre-grade state. */
  undoDemoReview: (cardId: ID, before: SchedulingState, logId: ID) => void
  /** Development affordance only. There is no product "reset demo" control. */
  resetDemoWorkspace: () => void
}

export const DemoWorkspaceContext = createContext<DemoWorkspaceValue | null>(null)

export function useDemoWorkspace(): DemoWorkspaceValue {
  const value = useContext(DemoWorkspaceContext)
  if (!value) {
    throw new Error(
      'useDemoWorkspace was called outside DemoWorkspaceProvider. Demo screens are only mounted in demo mode.',
    )
  }
  return value
}

/**
 * For components that render in both modes.
 *
 * The header is the case this exists for: it is shown on every tab, including
 * in a cloud build where there is no demo workspace and no notification source
 * at all. Returning null there lets it draw no unread badge, which is the
 * truthful result, instead of throwing on a screen that is otherwise fine.
 */
export function useDemoWorkspaceOptional(): DemoWorkspaceValue | null {
  return useContext(DemoWorkspaceContext)
}
