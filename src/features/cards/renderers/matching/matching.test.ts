import { describe, expect, it } from 'vitest'
import type { MatchingContent } from '@/types'
import { matchingDefinition } from './index'

const content: MatchingContent = {
  prompt: 'match',
  pairs: [
    { id: 'x', left: 'A', right: 'a' },
    { id: 'y', left: 'B', right: 'b' },
  ],
}

describe('matching autoGrade', () => {
  it('correct when every left maps to its own pair', () => {
    expect(matchingDefinition.autoGrade!(content, { x: 'x', y: 'y' })?.correct).toBe(
      true,
    )
  })
  it('incorrect when any match is swapped or missing', () => {
    expect(matchingDefinition.autoGrade!(content, { x: 'y', y: 'x' })?.correct).toBe(
      false,
    )
    expect(matchingDefinition.autoGrade!(content, { x: 'x' })?.correct).toBe(false)
  })
})

describe('matching isResponseReady', () => {
  it('requires every left assigned', () => {
    expect(matchingDefinition.isResponseReady!({ x: 'x' }, content)).toBe(false)
    expect(matchingDefinition.isResponseReady!({ x: 'x', y: 'y' }, content)).toBe(
      true,
    )
  })
})

describe('matching isComplete', () => {
  it('needs a prompt and 2+ fully filled pairs', () => {
    expect(matchingDefinition.isComplete(content)).toBe(true)
    expect(
      matchingDefinition.isComplete({
        ...content,
        pairs: [
          { id: 'x', left: 'A', right: '' },
          { id: 'y', left: 'B', right: 'b' },
        ],
      }),
    ).toBe(false)
  })
})
