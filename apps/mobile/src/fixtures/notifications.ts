import type { MobileNotificationsViewModel } from '@/src/types/notifications'

// Intentional route-level presentation fixture. A future notification source
// can replace this factory without changing the native inbox presentation.
export function createMobileNotificationsFixture(): MobileNotificationsViewModel {
  return {
    title: 'Notifications',
    subtitle: 'Updates about your study progress and sessions.',
    items: [
      {
        id: 'fixture-session-ready',
        group: 'today',
        kind: 'session',
        title: "Today's session is ready",
        body: 'You have 20 cards due for review. Keep up your momentum!',
        timeLabel: '10m ago',
        unread: true,
      },
      {
        id: 'fixture-modern-cpp-due',
        group: 'today',
        kind: 'deck',
        title: 'Modern C++ & Memory has 5 cards due',
        body: 'Review to strengthen your retention.',
        timeLabel: '25m ago',
        unread: true,
        deckMark: 'MC',
      },
      {
        id: 'fixture-streak',
        group: 'today',
        kind: 'streak',
        title: '7-day streak unlocked',
        body: "Amazing! You've kept your streak alive for 7 days.",
        timeLabel: '1h ago',
        unread: true,
      },
      {
        id: 'fixture-retention',
        group: 'today',
        kind: 'retention',
        title: 'Retention improved to 85%',
        body: 'Great job! Your retention is up 5% from last week.',
        timeLabel: '2h ago',
        unread: false,
      },
      {
        id: 'fixture-algorithms-due',
        group: 'today',
        kind: 'warning',
        title: 'Algorithms & Problem Solving is falling behind',
        body: 'You have 10 cards due. A quick review will keep you on track.',
        timeLabel: '4h ago',
        unread: true,
      },
      {
        id: 'fixture-import',
        group: 'earlier',
        kind: 'import',
        title: 'Deck import completed',
        body: '“System Design Essentials” was imported successfully with 42 cards.',
        timeLabel: 'Yesterday, 6:30 PM',
        unread: false,
      },
      {
        id: 'fixture-new-cards',
        group: 'earlier',
        kind: 'cards',
        title: 'New cards added',
        body: '12 new cards were added to “Interview Core”.',
        timeLabel: 'Yesterday, 2:15 PM',
        unread: false,
      },
    ],
  }
}
