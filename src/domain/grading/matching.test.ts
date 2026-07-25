import { describe, expect, it } from 'vitest'
import type { MatchingInteraction } from '@/types/cardV2'
import { gradeMatching, isMatchingResponseReady, type MatchingResponse } from './matching'

// Ordinary two-column matching.
const twoColumn: MatchingInteraction = {
  type: 'matching',
  columns: [
    { id: 'source', items: [{ id: 's1', content: { format: 'markdown', value: 'A' } }, { id: 's2', content: { format: 'markdown', value: 'B' } }] },
    { id: 'target', items: [{ id: 't1', content: { format: 'markdown', value: 'a' } }, { id: 't2', content: { format: 'markdown', value: 'b' } }] },
  ],
  relationships: [
    { source: 's1', target: 't1' },
    { source: 's2', target: 't2' },
  ],
}

// Three-part matching: source + two independently-graded target columns.
const threePart: MatchingInteraction = {
  type: 'matching',
  columns: [
    { id: 'source', items: [{ id: 's1', content: { format: 'markdown', value: 'A' } }, { id: 's2', content: { format: 'markdown', value: 'B' } }] },
    { id: 'target', items: [{ id: 't1', content: { format: 'markdown', value: 'a' } }, { id: 't2', content: { format: 'markdown', value: 'b' } }] },
    { id: 'third', items: [{ id: 'u1', content: { format: 'markdown', value: 'x' } }, { id: 'u2', content: { format: 'markdown', value: 'y' } }] },
  ],
  relationships: [
    { source: 's1', target: 't1', third: 'u1' },
    { source: 's2', target: 't2', third: 'u2' },
  ],
}

// A fixed column shares one option list across every row (e.g. Yes/No),
// graded by matching the row's authored item id, same as any other column.
const fixedColumn: MatchingInteraction = {
  type: 'matching',
  columns: [
    { id: 'source', items: [{ id: 's1', content: { format: 'markdown', value: 'A' } }, { id: 's2', content: { format: 'markdown', value: 'B' } }, { id: 's3', content: { format: 'markdown', value: 'C' } }] },
    { id: 'verdict', fixed: true, items: [{ id: 'yes', content: { format: 'markdown', value: 'Yes' } }, { id: 'no', content: { format: 'markdown', value: 'No' } }] },
  ],
  relationships: [
    { source: 's1', verdict: 'yes' },
    { source: 's2', verdict: 'no' },
    { source: 's3', verdict: 'yes' }, // shares "yes" with s1
  ],
}

describe('gradeMatching - two column', () => {
  it('is correct when every relationship matches', () => {
    const response: MatchingResponse = { s1: { target: 't1' }, s2: { target: 't2' } }
    const grade = gradeMatching(twoColumn, response)
    expect(grade.correct).toBe(true)
    expect(grade.score).toBe(1)
  })

  it('computes partial correctness when only some relationships match', () => {
    const response: MatchingResponse = { s1: { target: 't1' }, s2: { target: 't1' } }
    const grade = gradeMatching(twoColumn, response)
    expect(grade.correct).toBe(false)
    expect(grade.score).toBe(0.5)
    expect(grade.cells.find((c) => c.sourceItemId === 's1')?.correct).toBe(true)
    expect(grade.cells.find((c) => c.sourceItemId === 's2')?.correct).toBe(false)
  })
})

describe('gradeMatching - three-part', () => {
  it('grades both non-source columns independently', () => {
    const response: MatchingResponse = {
      s1: { target: 't1', third: 'u1' },
      s2: { target: 't2', third: 'u1' }, // third wrong for s2
    }
    const grade = gradeMatching(threePart, response)
    expect(grade.correct).toBe(false)
    expect(grade.score).toBeCloseTo(3 / 4)
    expect(grade.cells).toHaveLength(4)
  })
})

describe('gradeMatching - fixed column', () => {
  it('grades a shared value list by item id, so rows can share an answer', () => {
    const response: MatchingResponse = { s1: { verdict: 'yes' }, s2: { verdict: 'no' }, s3: { verdict: 'yes' } }
    const grade = gradeMatching(fixedColumn, response)
    expect(grade.correct).toBe(true)
  })

  it('marks a wrong shared-value choice incorrect independently per row', () => {
    const response: MatchingResponse = { s1: { verdict: 'no' }, s2: { verdict: 'no' }, s3: { verdict: 'yes' } }
    const grade = gradeMatching(fixedColumn, response)
    expect(grade.correct).toBe(false)
    expect(grade.score).toBeCloseTo(2 / 3)
  })
})

describe('isMatchingResponseReady', () => {
  it('requires every row/column cell filled', () => {
    expect(isMatchingResponseReady(twoColumn, { s1: { target: 't1' } })).toBe(false)
    expect(
      isMatchingResponseReady(twoColumn, { s1: { target: 't1' }, s2: { target: 't2' } }),
    ).toBe(true)
  })

  it('requires both columns when three-part', () => {
    expect(
      isMatchingResponseReady(threePart, { s1: { target: 't1' }, s2: { target: 't2' } }),
    ).toBe(false)
    expect(
      isMatchingResponseReady(threePart, {
        s1: { target: 't1', third: 'u1' },
        s2: { target: 't2', third: 'u2' },
      }),
    ).toBe(true)
  })
})
