import { describe, expect, it } from 'vitest'
import type { CodeCompletionContent } from '@/types'
import { codeCompletionDefinition } from './index'

function content(over: Partial<CodeCompletionContent> = {}): CodeCompletionContent {
  return {
    scaffold: { language: 'cpp', code: 'int f(){ /* ??? */ }' },
    solutions: ['return 42;'],
    validation: { mode: 'normalizedMatch', ignoreWhitespace: true, caseSensitive: false },
    explanation: '',
    ...over,
  }
}

const grade = (c: CodeCompletionContent, r: string) =>
  codeCompletionDefinition.autoGrade!(c, r)

describe('codeCompletion autoGrade', () => {
  it('matches ignoring whitespace and case by default', () => {
    expect(grade(content(), 'return 42;')?.correct).toBe(true)
    expect(grade(content(), 'RETURN   42 ;')?.correct).toBe(true)
    expect(grade(content(), 'return 43;')?.correct).toBe(false)
  })

  it('respects case-sensitive option', () => {
    const c = content({
      solutions: ['Foo'],
      validation: { mode: 'normalizedMatch', ignoreWhitespace: true, caseSensitive: true },
    })
    expect(grade(c, 'Foo')?.correct).toBe(true)
    expect(grade(c, 'foo')?.correct).toBe(false)
  })

  it('accepts any of multiple solutions', () => {
    const c = content({ solutions: ['return 42;', 'return 0x2a;'] })
    expect(grade(c, 'return 0x2a;')?.correct).toBe(true)
  })

  it('returns null (self-graded) when mode is none', () => {
    const c = content({
      validation: { mode: 'none', ignoreWhitespace: true, caseSensitive: false },
    })
    expect(grade(c, 'anything')).toBeNull()
  })

  it('empty answer is incorrect under auto-check', () => {
    expect(grade(content(), '   ')?.correct).toBe(false)
  })
})

describe('codeCompletion isComplete', () => {
  it('needs scaffold and at least one filled solution', () => {
    expect(codeCompletionDefinition.isComplete(content())).toBe(true)
    expect(
      codeCompletionDefinition.isComplete(content({ scaffold: { language: 'cpp', code: '' } })),
    ).toBe(false)
    expect(codeCompletionDefinition.isComplete(content({ solutions: [''] }))).toBe(false)
  })

  it('accepts a prompt instead of a scaffold (type-the-answer card)', () => {
    const promptOnly = content({
      prompt: 'How do you reverse a list in Python?',
      scaffold: { language: 'python', code: '' },
      solutions: ['lst[::-1]'],
    })
    expect(codeCompletionDefinition.isComplete(promptOnly)).toBe(true)
    // still needs a filled solution
    expect(
      codeCompletionDefinition.isComplete({ ...promptOnly, solutions: [''] }),
    ).toBe(false)
  })
})
