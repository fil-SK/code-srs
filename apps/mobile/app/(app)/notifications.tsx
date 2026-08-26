import { NotificationsScreen } from '@/src/components/notifications/NotificationsScreen'
import { demoNotificationsViewModel } from '@/src/demo/demoSelectors'
import { useDemoWorkspace } from '@/src/demo/demoWorkspaceContext'

// Read state lives in the demo provider rather than in the screen, so the
// header bell and this inbox cannot disagree about how much is unread. The
// inbox is the one demo concept with no Repository store, so this route reads
// the provider directly rather than through the entity seam.
export default function NotificationsRoute() {
  const {
    notifications,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
  } = useDemoWorkspace()

  return (
    <NotificationsScreen
      onMarkAllRead={markAllNotificationsRead}
      onMarkRead={markNotificationRead}
      onMarkUnread={markNotificationUnread}
      viewModel={demoNotificationsViewModel(notifications)}
    />
  )
}
