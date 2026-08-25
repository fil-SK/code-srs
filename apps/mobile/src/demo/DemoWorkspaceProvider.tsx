import type { ID, SchedulingState, SubmitReviewResult } from '@itera/core'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { DemoWorkspaceContext } from './demoWorkspaceContext'
import { createDemoWorkspace, type DemoWorkspace } from './demoWorkspace'

// The demo workspace as React state, and the only place demo state may change.
//
// Deliberately NOT a Repository implementation. The shared `Repository`
// contract represents real persistence infrastructure; a demo presentation
// store that pretends to be one would make every future reader ask which of the
// two is authoritative. This is a plain context, mobile-only, and nothing in
// @itera/core knows it exists.
//
// There is no AsyncStorage and no SQLite behind it: demo state lives for the
// life of the process and resets on a full app restart. That is the documented
// intent of this milestone, not an oversight - the purpose is an interactive
// demo, deterministic screenshots and physical-device UI testing, and real
// persistence is a separate concern that belongs with real data.
//
// `now` travels with the workspace rather than being read at each use site.
// Due-ness is a comparison against an instant, so the whole tree has to agree
// about which instant: Today's due count, Library's per-deck counts and the
// queue a session builds are otherwise free to disagree by however many
// milliseconds passed between their renders. It advances exactly when the
// workspace does, which is also the only moment any of those answers can
// change.

interface DemoState {
  workspace: DemoWorkspace
  now: number
}

function initialState(): DemoState {
  const now = Date.now()
  return { workspace: createDemoWorkspace(now), now }
}

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  // Built once for the life of the process, the same rule the query client and
  // the auth config follow in the composition root.
  const [state, setState] = useState(initialState)

  const update = useCallback((next: (workspace: DemoWorkspace) => DemoWorkspace) => {
    setState((current) => ({ workspace: next(current.workspace), now: Date.now() }))
  }, [])

  const markNotificationRead = useCallback(
    (id: string) => {
      update((workspace) => ({
        ...workspace,
        notifications: workspace.notifications.map((item) =>
          item.id === id ? { ...item, unread: false } : item,
        ),
      }))
    },
    [update],
  )

  const markAllNotificationsRead = useCallback(() => {
    update((workspace) => ({
      ...workspace,
      notifications: workspace.notifications.map((item) => ({ ...item, unread: false })),
    }))
  }, [update])

  // The one write a review performs. The result is computed by the shared
  // reviewService and arrives here already immutable; nothing is recomputed,
  // and no FSRS logic lives on this platform.
  //
  // Keyed on the log id rather than the card id: a double press on a rating
  // sends the same result twice, and a demo that recorded two reviews for one
  // card would misreport its own history. A genuine second review of the same
  // card carries a different log id and is appended normally.
  const applyDemoReview = useCallback(
    (result: SubmitReviewResult) => {
      update((workspace) => {
        if (workspace.reviewLogs.some((log) => log.id === result.log.id)) return workspace
        return {
          ...workspace,
          cards: workspace.cards.map((card) =>
            card.id === result.log.cardId ? { ...card, scheduling: result.after } : card,
          ),
          reviewLogs: [...workspace.reviewLogs, result.log],
        }
      })
    },
    [update],
  )

  // Restores the recorded pre-grade state rather than running the scheduler
  // backwards. FSRS is not invertible - re-deriving `before` from `after` would
  // be a second, wrong implementation of scheduling on the platform that is
  // least allowed to have one.
  const undoDemoReview = useCallback(
    (cardId: ID, before: SchedulingState, logId: ID) => {
      update((workspace) => ({
        ...workspace,
        cards: workspace.cards.map((card) =>
          card.id === cardId ? { ...card, scheduling: before } : card,
        ),
        reviewLogs: workspace.reviewLogs.filter((log) => log.id !== logId),
      }))
    },
    [update],
  )

  const resetDemoWorkspace = useCallback(() => {
    if (!__DEV__) return
    setState(initialState())
  }, [])

  const value = useMemo(
    () => ({
      workspace: state.workspace,
      now: state.now,
      markNotificationRead,
      markAllNotificationsRead,
      applyDemoReview,
      undoDemoReview,
      resetDemoWorkspace,
    }),
    [
      state,
      markNotificationRead,
      markAllNotificationsRead,
      applyDemoReview,
      undoDemoReview,
      resetDemoWorkspace,
    ],
  )

  return <DemoWorkspaceContext.Provider value={value}>{children}</DemoWorkspaceContext.Provider>
}
