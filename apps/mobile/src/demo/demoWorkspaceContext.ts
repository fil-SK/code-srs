import type { Millis } from '@itera/core'
import { createContext, useContext } from 'react'

import type { DemoNotification } from './demoWorkspace'

// The demo runtime context and its two accessors, kept apart from the provider
// component so neither file mixes components with plain exports.
//
// This is deliberately small. Decks, cards and review logs are not here: the
// InMemoryRepository owns them, screens read them through the shared hooks, and
// an entity mirror in React state beside that would be a second source of truth
// that could disagree with the first. What remains is the demo-runtime state
// that genuinely has no Repository store.

export interface DemoWorkspaceValue {
  /**
   * The instant the whole tree compares due dates against.
   *
   * Due-ness is a comparison against an instant, so the tree has to agree about
   * which instant: Today's due count, Library's per-deck counts and the queue a
   * session builds are otherwise free to disagree by however many milliseconds
   * passed between their renders. It used to advance whenever the workspace did,
   * which is no longer a moment this provider can observe - see refreshDemoNow.
   */
  now: Millis
  /**
   * Advance the demo clock to the present.
   *
   * Called when a tab screen gains focus. A phone keeps its screens mounted for
   * as long as the app runs, so a clock snapshotted once at mount would never
   * notice a card becoming due; a ticking global clock would re-render the whole
   * tree on a timer for a demo that is usually looked at for minutes. Focus is
   * the moment a learner is about to read a number, which is exactly when it is
   * worth being current.
   */
  refreshDemoNow: () => void
  notifications: DemoNotification[]
  markNotificationRead: (id: string) => void
  markNotificationUnread: (id: string) => void
  markAllNotificationsRead: () => void
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
 * in a cloud build where there is no demo runtime and no notification source at
 * all. Returning null there lets it draw no unread badge, which is the truthful
 * result, instead of throwing on a screen that is otherwise fine.
 */
export function useDemoWorkspaceOptional(): DemoWorkspaceValue | null {
  return useContext(DemoWorkspaceContext)
}
