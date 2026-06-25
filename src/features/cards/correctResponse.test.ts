import { describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { correctResponse } from './correctResponse'

function card<T extends Card['type']>(
  type: T,
  content: Extract<Card, { type: T }>['content'],
): Card {
  return {
    id: 'c',
    deckId: 'd',
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    suspended: false,
    scheduling: initialSchedulingState(1),
    type,
    content,
  } as Card
}

describe('correctResponse', () => {
  it('mcq → correct option ids', () => {
    const c = card('mcq', {
      prompt: 'p',
      options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
      correct: ['b'],
      multiple: false,
    })
    expect(correctResponse(c)).toEqual(['b'])
  })

  it('ordering → ids in canonical order', () => {
    const c = card('ordering', {
      prompt: 'p',
      items: [{ id: 'x', text: '1' }, { id: 'y', text: '2' }],
    })
    expect(correctResponse(c)).toEqual(['x', 'y'])
  })

  it('matching → each left mapped to its own pair', () => {
    const c = card('matching', {
      prompt: 'p',
      pairs: [{ id: 'p1', left: 'L', right: 'R' }],
    })
    expect(correctResponse(c)).toEqual({ p1: 'p1' })
  })

  it('codeCompletion → first solution', () => {
    const c = card('codeCompletion', {
      scaffold: { language: 'cpp', code: '' },
      solutions: ['return 1;'],
      validation: { mode: 'normalizedMatch', ignoreWhitespace: true, caseSensitive: false },
    })
    expect(correctResponse(c)).toBe('return 1;')
  })

  it('self-graded types → undefined', () => {
    const c = card('basic', { front: 'q', back: 'a' })
    expect(correctResponse(c)).toBeUndefined()
  })
})
