import type { Millis, SchedulingState } from '@/types'

// The scheduling state a freshly created card starts with: due immediately as a
// "new" card. M2 wires ts-fsrs to evolve this state on each review; this is the
// neutral seed the FSRS scheduler initializes from.
export function initialSchedulingState(now: Millis = Date.now()): SchedulingState {
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
  }
}
