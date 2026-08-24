import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoNotificationsViewModel, demoUnreadCount } from '@/src/demo/demoSelectors'
import { createDemoWorkspace, type DemoWorkspace } from '@/src/demo/demoWorkspace'
import { pushedDeckIds, resetRouterCalls, routerDouble } from '@/src/test/routerDouble'
import { NotificationsScreen } from './NotificationsScreen'

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

const workspace = createDemoWorkspace()

function withReadState(overrides: Record<string, boolean>): DemoWorkspace {
  return {
    ...workspace,
    notifications: workspace.notifications.map((item) =>
      item.id in overrides ? { ...item, unread: overrides[item.id] } : item,
    ),
  }
}

function renderInbox(ws: DemoWorkspace, handlers: Partial<{
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}> = {}) {
  return render(
    <NotificationsScreen
      onMarkAllRead={handlers.onMarkAllRead ?? jest.fn()}
      onMarkRead={handlers.onMarkRead ?? jest.fn()}
      viewModel={demoNotificationsViewModel(ws)}
    />,
  )
}

beforeEach(() => {
  resetRouterCalls()
})

describe('unread state', () => {
  it('counts unread items from the workspace, not from screen-local state', () => {
    expect(demoUnreadCount(workspace)).toBe(
      workspace.notifications.filter((item) => item.unread).length,
    )
  })

  it('marks one item read through the workspace', () => {
    const onMarkRead = jest.fn()
    renderInbox(workspace, { onMarkRead })

    fireEvent.press(screen.getByText("Today's session is ready"))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-session-ready')
  })

  it('filters to unread only', () => {
    renderInbox(workspace)
    expect(screen.queryByText('Retention improved to 89%')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Show unread only'))

    // The retention item starts read, so it drops out of the unread view.
    expect(screen.queryByText('Retention improved to 89%')).toBeNull()
    expect(screen.queryByText("Today's session is ready")).toBeTruthy()
  })

  it('says so when nothing is unread', () => {
    const allRead = {
      ...workspace,
      notifications: workspace.notifications.map((item) => ({ ...item, unread: false })),
    }
    renderInbox(allRead)

    fireEvent.press(screen.getByLabelText('Show unread only'))
    expect(screen.getByText('You’re all caught up')).toBeTruthy()
  })
})

describe('mark all as read', () => {
  it('is reachable when Today has unread items', () => {
    const onMarkAllRead = jest.fn()
    renderInbox(workspace, { onMarkAllRead })

    fireEvent.press(screen.getByText('Mark all as read'))
    expect(onMarkAllRead).toHaveBeenCalled()
  })

  it('is still reachable when only Earlier has unread items', () => {
    // The audit's edge case: the control was rendered only in the Today
    // heading, so once Today was fully read it disappeared while unread items
    // remained under Earlier, with no way to clear them in one go.
    const onlyEarlierUnread = withReadState({
      'fixture-session-ready': false,
      'fixture-modern-cpp-due': false,
      'fixture-streak': false,
      'fixture-algorithms-due': false,
      'fixture-new-cards': true,
    })
    expect(
      demoNotificationsViewModel(onlyEarlierUnread).items.filter(
        (item) => item.group === 'today' && item.unread,
      ),
    ).toEqual([])

    const onMarkAllRead = jest.fn()
    renderInbox(onlyEarlierUnread, { onMarkAllRead })

    fireEvent.press(screen.getByText('Mark all as read'))
    expect(onMarkAllRead).toHaveBeenCalled()
  })

  it('is absent when there is nothing to mark', () => {
    const allRead = {
      ...workspace,
      notifications: workspace.notifications.map((item) => ({ ...item, unread: false })),
    }
    renderInbox(allRead)
    expect(screen.queryByText('Mark all as read')).toBeNull()
  })

  it('shows only one, never one per group', () => {
    renderInbox(workspace)
    expect(screen.getAllByText('Mark all as read')).toHaveLength(1)
  })
})

describe('destinations', () => {
  it('opens the deck a notification is about, and marks it read', () => {
    const onMarkRead = jest.fn()
    renderInbox(workspace, { onMarkRead })

    fireEvent.press(screen.getByText('Modern C++ & Memory has 3 cards due'))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-modern-cpp-due')
    expect(pushedDeckIds()).toEqual(['fixture-modern-cpp'])
  })

  it('only marks read when there is no deck to open', () => {
    const onMarkRead = jest.fn()
    renderInbox(workspace, { onMarkRead })

    fireEvent.press(screen.getByText('12-day streak unlocked'))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-streak')
    expect(pushedDeckIds()).toEqual([])
  })

  it('describes which of the two a row will do', () => {
    renderInbox(workspace)

    expect(
      screen.getByLabelText(/Modern C\+\+ & Memory has 3 cards due/).props.accessibilityHint,
    ).toBe('Marks this as read and opens the deck')
    expect(
      screen.getByLabelText(/12-day streak unlocked/).props.accessibilityHint,
    ).toBe('Marks this notification as read')
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
