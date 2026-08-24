import type { MobileProgressViewModel } from '@/src/types/progress'

const activityLevels: (0 | 1 | 2 | 3 | 4)[] = [
  0, 0, 1, 2, 0, 0, 0,
  1, 3, 4, 3, 2, 0, 0,
  2, 4, 4, 3, 2, 1, 0,
  1, 3, 4, 4, 2, 1, 0,
  0, 2,
]

export const mobileProgressFixture: MobileProgressViewModel = {
  rangeLabel: 'Aug 24 – Sep 23, 2026',
  metrics: [
    { id: 'learned', label: 'Learned', value: '19', supportingText: '19 of 39 active' },
    { id: 'due', label: 'Due', value: '20', supportingText: 'Ready today' },
    { id: 'reviews', label: 'Reviews', value: '81', supportingText: 'This period' },
    { id: 'retention', label: 'Retention', value: '85%', supportingText: 'Mature reviews' },
    { id: 'streak', label: 'Current streak', value: '6 days', supportingText: 'Best: 7 days' },
  ],
  activityDays: activityLevels.map((level, index) => ({ id: `day-${index + 1}`, level })),
  retentionPercent: 85,
  retentionSeries: [82, 81, 84, 83, 80, 81, 86, 85, 80, 78, 77, 80, 75, 78, 77, 82, 81, 85],
  decks: [
    {
      id: 'fixture-modern-cpp',
      name: 'Modern C++ & Memory',
      mark: 'MC',
      retentionLabel: '89% retention',
      dueLabel: '6 due',
    },
    {
      id: 'fixture-algorithms',
      name: 'Algorithms & Problem Solving',
      mark: 'A&',
      retentionLabel: 'Not enough data',
      dueLabel: '10 due',
    },
    {
      id: 'fixture-systems-distributed',
      name: 'Systems & Distributed Systems',
      mark: 'S&',
      retentionLabel: 'Not enough data',
      dueLabel: '10 due',
    },
  ],
  milestones: [
    {
      id: 'streak-7',
      type: 'streak',
      title: '7-day streak',
      subtitle: 'Keep it going',
      dateLabel: 'Aug 22',
    },
    {
      id: 'retention-80',
      type: 'retention',
      title: '80% retention',
      subtitle: 'Great recall',
      dateLabel: 'Aug 20',
    },
    {
      id: 'retention-70',
      type: 'retention',
      title: '70% retention',
      subtitle: 'Building consistency',
      dateLabel: 'Aug 15',
    },
  ],
}
