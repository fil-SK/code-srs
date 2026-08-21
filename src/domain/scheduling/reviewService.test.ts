import { describe, expect, it } from 'vitest'
import type { Rating, SchedulingState, SchedulingStateKind } from '@/types'
import { initialSchedulingState } from './state'
import { reviewService } from './reviewService'

const NOW = 1_700_000_000_000
const DAY = 86_400_000

function state(kind: SchedulingStateKind): SchedulingState {
  if (kind === 'new') return initialSchedulingState(NOW)
  return {
    ...initialSchedulingState(NOW),
    due: NOW,
    stability: 5,
    difficulty: 5,
    elapsedDays: 5,
    scheduledDays: 5,
    reps: 3,
    lapses: kind === 'relearning' ? 1 : 0,
    learningSteps: kind === 'review' ? 0 : 1,
    state: kind,
    lastReview: NOW - 5 * DAY,
  }
}

describe('reviewService.submit', () => {
  it('computes the next state and a matching log via the scheduler, without persisting anything', async () => {
    const before = initialSchedulingState(NOW)
    const { after, log } = await reviewService.submit({
      cardId: 'c1',
      before,
      rating: 3,
      autoGraded: true,
      durationMs: 500,
      now: NOW,
    })
    expect(after.reps).toBe(1)
    expect(after.due).toBeGreaterThan(NOW)
    expect(log.cardId).toBe('c1')
    expect(log.rating).toBe(3)
    expect(log.autoGraded).toBe(true)
    expect(log.stabilityBefore).toBe(before.stability)
    expect(log.stabilityAfter).toBe(after.stability)
    expect(log.stateBefore).toBe('new')
    expect(log.state).toBe(after.state)
  })

  it.each([
    ['new', 4],
    ['learning', 3],
    ['review', 1],
    ['review', 3],
    ['relearning', 2],
  ] as const)('records %s before grading with rating %s', async (kind, rating) => {
    const before = state(kind)
    const { after, log } = await reviewService.submit({
      cardId: `${kind}-${rating}`,
      before,
      rating: rating as Rating,
      autoGraded: false,
      durationMs: 500,
      now: NOW,
    })
    expect(log.stateBefore).toBe(kind)
    expect(log.state).toBe(after.state)
  })

  it('records Review -> Again as mature before-state and Relearning after-state', async () => {
    const { after, log } = await reviewService.submit({
      cardId: 'review-again',
      before: state('review'),
      rating: 1,
      autoGraded: false,
      durationMs: 500,
      now: NOW,
    })
    expect(log.stateBefore).toBe('review')
    expect(log.state).toBe(after.state)
    expect(after.state).toBe('relearning')
  })
})

describe('reviewService.previewNextStates', () => {
  it('returns monotonically non-decreasing due dates across grades', () => {
    const p = reviewService.previewNextStates(initialSchedulingState(NOW), NOW)
    expect(p[1].due).toBeLessThanOrEqual(p[2].due)
    expect(p[2].due).toBeLessThanOrEqual(p[3].due)
    expect(p[3].due).toBeLessThanOrEqual(p[4].due)
  })
})
