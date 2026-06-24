import { describe, expect, it } from 'vitest'
import type { McqContent } from '@/types'
import { mcqDefinition } from './index'

const base: McqContent = {
  prompt: 'pick',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
  ],
  correct: ['a'],
  multiple: false,
  explanation: '',
}

const grade = (content: McqContent, response: string[]) =>
  mcqDefinition.autoGrade!(content, response)

describe('mcq autoGrade', () => {
  it('single answer: correct when the right option is chosen', () => {
    expect(grade(base, ['a'])?.correct).toBe(true)
    expect(grade(base, ['b'])?.correct).toBe(false)
  })

  it('multiple answers: requires the exact set', () => {
    const multi: McqContent = { ...base, multiple: true, correct: ['a', 'b'] }
    expect(grade(multi, ['a', 'b'])?.correct).toBe(true)
    expect(grade(multi, ['b', 'a'])?.correct).toBe(true) // order-independent
    expect(grade(multi, ['a'])?.correct).toBe(false) // partial
    expect(grade(multi, ['a', 'b', 'c'])?.correct).toBe(false) // extra
  })

  it('empty response is incorrect', () => {
    expect(grade(base, [])?.correct).toBe(false)
  })
})

describe('mcq isResponseReady', () => {
  it('requires at least one selection', () => {
    expect(mcqDefinition.isResponseReady!([])).toBe(false)
    expect(mcqDefinition.isResponseReady!(['a'])).toBe(true)
    expect(mcqDefinition.isResponseReady!(undefined)).toBe(false)
  })
})

describe('mcq isComplete', () => {
  it('needs prompt, 2+ filled options, and a correct answer', () => {
    expect(mcqDefinition.isComplete(base)).toBe(true)
    expect(mcqDefinition.isComplete({ ...base, prompt: '' })).toBe(false)
    expect(mcqDefinition.isComplete({ ...base, correct: [] })).toBe(false)
    expect(
      mcqDefinition.isComplete({
        ...base,
        options: [{ id: 'a', text: 'A' }, { id: 'b', text: '' }],
      }),
    ).toBe(false)
  })
})
