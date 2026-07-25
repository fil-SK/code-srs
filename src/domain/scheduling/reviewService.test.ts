import { describe, expect, it } from 'vitest'
import { initialSchedulingState } from './state'
import { reviewService } from './reviewService'

const NOW = 1_700_000_000_000

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
