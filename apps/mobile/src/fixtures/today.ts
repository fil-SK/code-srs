import { pickDashboardMessage } from '@itera/core'

import type { MobileTodayViewModel } from '@/src/types/today'

// Intentional route-level presentation fixture. Production data composition
// will replace this one factory without changing TodayScreen or its children.
export function createMobileTodayFixture(): MobileTodayViewModel {
  return {
    greeting: pickDashboardMessage(),
    dueToday: 23,
    streak: 12,
    retention: 89,
    estimatedMinutes: 32,
    decks: [
      {
        id: 'fixture-algorithms',
        name: 'Algorithms & Problem Solving',
        description: 'Invariants, data structures, graph reasoning',
        dueCount: 23,
        progressPercent: 76,
      },
      {
        id: 'fixture-compilers',
        name: 'Compilers & MLIR',
        description: 'Transferable compiler concepts from theory to IR',
        dueCount: 18,
        progressPercent: 63,
      },
      {
        id: 'fixture-modern-cpp',
        name: 'Modern C++ & Memory',
        description: 'Values, lifetime, ownership, and performance',
        dueCount: 12,
        progressPercent: 58,
      },
      {
        id: 'fixture-systems',
        name: 'Systems & Distributed Systems',
        description: 'Concurrency, storage, networking, and scaling',
        dueCount: 7,
        progressPercent: 41,
      },
    ],
  }
}
