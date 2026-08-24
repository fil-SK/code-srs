import { NotificationsScreen } from '@/src/components/notifications/NotificationsScreen'
import { createMobileNotificationsFixture } from '@/src/fixtures/notifications'

export default function NotificationsRoute() {
  return <NotificationsScreen viewModel={createMobileNotificationsFixture()} />
}
