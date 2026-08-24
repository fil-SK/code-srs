import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { DemoWorkspaceContext } from './demoWorkspaceContext'
import { createDemoWorkspace } from './demoWorkspace'

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
// Only notification read state is mutable today. Everything else is derived by
// demoSelectors from an immutable dataset, so there is nothing else to hold.
export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  // Built once for the life of the process, the same rule the query client and
  // the auth config follow in the composition root.
  const [workspace, setWorkspace] = useState(createDemoWorkspace)

  const markNotificationRead = useCallback((id: string) => {
    setWorkspace((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.id === id ? { ...item, unread: false } : item,
      ),
    }))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setWorkspace((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({ ...item, unread: false })),
    }))
  }, [])

  const resetDemoWorkspace = useCallback(() => {
    if (!__DEV__) return
    setWorkspace(createDemoWorkspace())
  }, [])

  const value = useMemo(
    () => ({ workspace, markNotificationRead, markAllNotificationsRead, resetDemoWorkspace }),
    [workspace, markNotificationRead, markAllNotificationsRead, resetDemoWorkspace],
  )

  return <DemoWorkspaceContext.Provider value={value}>{children}</DemoWorkspaceContext.Provider>
}
