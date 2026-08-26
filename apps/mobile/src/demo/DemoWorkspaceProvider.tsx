import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { DemoWorkspaceContext } from './demoWorkspaceContext'
import { composeDemoRepository, demoStartedAt, resetDemoRepository } from './demoRuntime'
import type { DemoNotification } from './demoWorkspace'

// Demo-runtime state that has no Repository store, and nothing else.
//
// Decks, cards and review logs used to live here as React state, and this
// provider was the only place they could change. They now live in the
// InMemoryRepository that demoRuntime registers, screens read them through the
// shared hooks, and re-render comes from TanStack Query invalidation - the same
// mechanism web has always used. Keeping a copy here as well would be two
// mutable stores for one set of entities, which is the failure this milestone
// existed to remove.
//
// What is left genuinely belongs to the demo: the clock every due comparison is
// made against, the notification inbox (the one demo concept with no Repository
// store), and the development reset that has to coordinate all three layers.
//
// There is still no AsyncStorage and no SQLite behind any of it: demo state
// lives for the life of the process and resets on a full app restart. That is
// the documented intent - an interactive demo, deterministic screenshots and
// physical-device UI testing - not an oversight.

interface DemoState {
  now: number
  notifications: DemoNotification[]
}

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // Built once for the life of the process, the same rule the query client and
  // the auth config follow in the composition root. Composing the repository
  // here rather than at module scope keeps the seed and the inbox derived from
  // one `createDemoSeed` call, so the notification copy cannot quote counts
  // from a dataset the repository does not hold.
  const [state, setState] = useState<DemoState>(() => {
    const seed = composeDemoRepository()
    return { now: seed.startedAt, notifications: seed.notifications }
  })

  const refreshDemoNow = useCallback(() => {
    setState((current) => {
      const now = Date.now()
      // Same-millisecond focus events are common on a tab bar; bailing keeps the
      // context value identity stable so focusing a tab is not a tree-wide
      // re-render on its own.
      return now === current.now ? current : { ...current, now }
    })
  }, [])

  const setNotifications = useCallback(
    (next: (items: DemoNotification[]) => DemoNotification[]) => {
      setState((current) => ({ ...current, notifications: next(current.notifications) }))
    },
    [],
  )

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, unread: false } : item)),
      )
    },
    [setNotifications],
  )

  const markNotificationUnread = useCallback(
    (id: string) => {
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, unread: true } : item)),
      )
    },
    [setNotifications],
  )

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })))
  }, [setNotifications])

  // Restores the seeded dataset and discards everything authored during the run.
  //
  // Three layers have to move together. The repository is reseeded from the
  // recorded anchor, so the rebuild is byte-identical rather than drifting with
  // the wall clock (D417). The query cache is then cleared, which is load-
  // bearing: every screen reads through TanStack Query, and without this they
  // would keep rendering the pre-reset entities from cache until something
  // happened to invalidate them. The inbox and the clock are restored last,
  // from the same seed value the repository was given.
  const resetDemoWorkspace = useCallback(() => {
    if (!__DEV__) return
    const seed = resetDemoRepository()
    queryClient.clear()
    setState({ now: demoStartedAt(), notifications: seed.notifications })
  }, [queryClient])

  const value = useMemo(
    () => ({
      now: state.now,
      refreshDemoNow,
      notifications: state.notifications,
      markNotificationRead,
      markNotificationUnread,
      markAllNotificationsRead,
      resetDemoWorkspace,
    }),
    [
      state,
      refreshDemoNow,
      markNotificationRead,
      markNotificationUnread,
      markAllNotificationsRead,
      resetDemoWorkspace,
    ],
  )

  return <DemoWorkspaceContext.Provider value={value}>{children}</DemoWorkspaceContext.Provider>
}
