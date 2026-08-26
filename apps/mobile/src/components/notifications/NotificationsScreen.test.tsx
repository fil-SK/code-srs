import { fireEvent, render, screen } from '@testing-library/react-native'

import { demoNotificationsViewModel, demoUnreadCount } from '@/src/demo/demoSelectors'
import { createDemoSeed, type DemoNotification } from '@/src/demo/demoWorkspace'
import { pushedDeckIds, resetRouterCalls, routerCalls, routerDouble } from '@/src/test/routerDouble'
import { NotificationsScreen } from './NotificationsScreen'

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useRouter: () => require('@/src/test/routerDouble').routerDouble,
}))

const entities = createDemoSeed()

function withReadState(overrides: Record<string, boolean>): DemoNotification[] {
  return entities.notifications.map((item) =>
    item.id in overrides ? { ...item, unread: overrides[item.id] } : item,
  )
}

function renderInbox(ws: DemoNotification[], handlers: Partial<{
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
  onMarkAllRead: () => void
}> = {}) {
  return render(
    <NotificationsScreen
      onMarkAllRead={handlers.onMarkAllRead ?? jest.fn()}
      onMarkRead={handlers.onMarkRead ?? jest.fn()}
      onMarkUnread={handlers.onMarkUnread ?? jest.fn()}
      viewModel={demoNotificationsViewModel(ws)}
    />,
  )
}

beforeEach(() => {
  resetRouterCalls()
})

describe('unread state', () => {
  it('counts unread items from the workspace, not from screen-local state', () => {
    expect(demoUnreadCount(entities.notifications)).toBe(
      entities.notifications.filter((item) => item.unread).length,
    )
  })

  it('marks one item read through the workspace', () => {
    const onMarkRead = jest.fn()
    renderInbox(entities.notifications, { onMarkRead })

    fireEvent.press(screen.getByText("Today's session is ready"))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-session-ready')
  })

  it('marks an item read from its status control without opening it', () => {
    const onMarkRead = jest.fn()
    renderInbox(entities.notifications, { onMarkRead })

    fireEvent.press(screen.getByLabelText("Mark Today's session is ready as read"))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-session-ready')
    expect(routerCalls.push).toEqual([])
  })

  it('marks a read item unread from the same status control', () => {
    const onMarkUnread = jest.fn()
    const retention = entities.notifications.find((item) => item.id === 'fixture-retention')!
    renderInbox(entities.notifications, { onMarkUnread })

    fireEvent.press(screen.getByLabelText(`Mark ${retention.title} as unread`))

    expect(onMarkUnread).toHaveBeenCalledWith(retention.id)
    expect(routerCalls.push).toEqual([])
  })

  it('filters to unread only', () => {
    renderInbox(entities.notifications)
    const retention = entities.notifications.find((item) => item.id === 'fixture-retention')!
    expect(screen.queryByText(retention.title)).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Show unread only'))

    // The retention item starts read, so it drops out of the unread view.
    expect(screen.queryByText(retention.title)).toBeNull()
    expect(screen.queryByText("Today's session is ready")).toBeTruthy()
  })

  it('says so when nothing is unread', () => {
    const allRead = entities.notifications.map((item) => ({ ...item, unread: false }))
    renderInbox(allRead)

    fireEvent.press(screen.getByLabelText('Show unread only'))
    expect(screen.getByText('You’re all caught up')).toBeTruthy()
  })
})

describe('mark all as read', () => {
  it('is reachable when Today has unread items', () => {
    const onMarkAllRead = jest.fn()
    renderInbox(entities.notifications, { onMarkAllRead })

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
    const allRead = entities.notifications.map((item) => ({ ...item, unread: false }))
    renderInbox(allRead)
    expect(screen.queryByText('Mark all as read')).toBeNull()
  })

  it('shows only one, never one per group', () => {
    renderInbox(entities.notifications)
    expect(screen.getAllByText('Mark all as read')).toHaveLength(1)
  })
})

describe('destinations', () => {
  it('opens the deck a notification is about, and marks it read', () => {
    const onMarkRead = jest.fn()
    renderInbox(entities.notifications, { onMarkRead })

    fireEvent.press(screen.getByText('Modern C++ & Memory has 3 cards due'))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-modern-cpp-due')
    expect(pushedDeckIds()).toEqual(['fixture-modern-cpp'])
  })

  // Every seeded notification answers with a surface that exists, so no row in
  // the inbox is a dead end. The mapping is data on the notification rather than
  // an inference from its kind, and this asserts each row lands where its own
  // destination says.
  it.each([
    ['fixture-session-ready', '/review'],
    ['fixture-streak', '/progress'],
    ['fixture-retention', '/progress'],
  ])('opens %s at %s, and marks it read', (id, pathname) => {
    const onMarkRead = jest.fn()
    const item = entities.notifications.find((entry) => entry.id === id)!
    renderInbox(withReadState({ [id]: true }), { onMarkRead })

    fireEvent.press(screen.getByText(item.title))

    expect(onMarkRead).toHaveBeenCalledWith(id)
    expect(routerCalls.push).toEqual([pathname])
  })

  it('opens the collection a notification is about', () => {
    const onMarkRead = jest.fn()
    const item = entities.notifications.find((entry) => entry.id === 'fixture-new-cards')!
    renderInbox(entities.notifications, { onMarkRead })

    fireEvent.press(screen.getByText(item.title))

    expect(onMarkRead).toHaveBeenCalledWith('fixture-new-cards')
    expect(routerCalls.push).toEqual([
      { pathname: '/library/[collectionId]', params: { collectionId: 'fixture-interview-core' } },
    ])
  })

  it('names the destination in the hint rather than implying one', () => {
    renderInbox(entities.notifications)
    const streak = entities.notifications.find((item) => item.id === 'fixture-streak')!
    const session = entities.notifications.find((item) => item.id === 'fixture-session-ready')!
    const openingHint = (label: RegExp) =>
      screen
        .getAllByLabelText(label)
        .find((element) => element.props.accessibilityHint?.includes('opens'))?.props
        .accessibilityHint

    expect(openingHint(/Modern C\+\+ & Memory has 3 cards due/)).toBe(
      'Marks this as read and opens the deck',
    )
    expect(openingHint(new RegExp(streak.title))).toBe(
      'Marks this as read and opens your progress',
    )
    expect(openingHint(new RegExp(session.title))).toBe(
      'Marks this as read and opens your review session',
    )
  })

  it('offers no notification-settings shortcut in demo mode', () => {
    // In demo mode Profile does not render its settings sections, so the
    // shortcut would land on a screen with nothing to show.
    renderInbox(entities.notifications)

    expect(screen.queryByLabelText('Open notification settings')).toBeNull()
  })
})

// Referenced so the mock factory's module is loaded in this file's scope.
expect(routerDouble).toBeTruthy()
