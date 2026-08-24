import { NotificationsScreen } from '@/src/components/notifications/NotificationsScreen'
import { demoNotificationsViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// Read state lives in the demo workspace rather than in the screen, so the
// header bell and this inbox cannot disagree about how much is unread.
export default function NotificationsRoute() {
  const { workspace, markNotificationRead, markAllNotificationsRead } = useDemoWorkspace()

  return (
    <NotificationsScreen
      onMarkAllRead={markAllNotificationsRead}
      onMarkRead={markNotificationRead}
      viewModel={demoNotificationsViewModel(workspace)}
    />
  )
}
