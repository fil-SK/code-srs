import { describe, expect, it } from 'vitest'
import type { OrderingInteraction } from '@/types/cardV2'
import { gradeOrdering, isOrderingResponseReady } from './ordering'

const interaction: OrderingInteraction = {
  type: 'ordering',
  randomize: true,
  items: [
    { id: 'a', content: { format: 'markdown', value: 'First' } },
    { id: 'b', content: { format: 'markdown', value: 'Second' } },
    { id: 'c', content: { format: 'markdown', value: 'Third' } },
  ],
  correctOrder: ['a', 'b', 'c'],
}

describe('gradeOrdering', () => {
  it('is fully correct when the submitted order matches exactly', () => {
    const grade = gradeOrdering(interaction, ['a', 'b', 'c'])
    expect(grade.correct).toBe(true)
    expect(grade.score).toBe(1)
    expect(grade.positions.every((p) => p.correct)).toBe(true)
  })

  it('scores partial credit by position, not by "somewhere in order"', () => {
    const grade = gradeOrdering(interaction, ['a', 'c', 'b'])
    expect(grade.correct).toBe(false)
    expect(grade.score).toBeCloseTo(1 / 3)
    expect(grade.positions.find((p) => p.itemId === 'a')?.correct).toBe(true)
    expect(grade.positions.find((p) => p.itemId === 'b')?.correct).toBe(false)
    expect(grade.positions.find((p) => p.itemId === 'c')?.correct).toBe(false)
  })

  it('is fully incorrect when every item is displaced', () => {
    const grade = gradeOrdering(interaction, ['c', 'a', 'b'])
    expect(grade.correct).toBe(false)
    expect(grade.score).toBe(0)
  })
})

describe('isOrderingResponseReady', () => {
  it('requires every item present exactly once', () => {
    expect(isOrderingResponseReady(interaction, ['a', 'b', 'c'])).toBe(true)
    expect(isOrderingResponseReady(interaction, ['a', 'b'])).toBe(false)
    expect(isOrderingResponseReady(interaction, ['a', 'a', 'b'])).toBe(false)
    expect(isOrderingResponseReady(interaction, undefined)).toBe(false)
  })
})
