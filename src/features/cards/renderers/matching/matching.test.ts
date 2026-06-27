import { describe, expect, it } from 'vitest'
import type { MatchingContent } from '@/types'
import { matchingDefinition } from './index'
import { thirdKey } from './keys'

const content: MatchingContent = {
  prompt: 'match',
  pairs: [
    { id: 'x', left: 'A', right: 'a' },
    { id: 'y', left: 'B', right: 'b' },
  ],
}

const triple: MatchingContent = {
  prompt: 'match',
  triple: true,
  pairs: [
    { id: 'x', left: 'A', right: 'a', third: 'a2' },
    { id: 'y', left: 'B', right: 'b', third: 'b2' },
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

describe('matching fixed-option columns (dropdown matching)', () => {
  // Right column is a shared Yes/No list; third column is unique matching.
  const fixed: MatchingContent = {
    prompt: 'p',
    triple: true,
    options: { right: ['Yes', 'No'] },
    pairs: [
      { id: 'a', left: 'A', right: 'Yes', third: 'a3' },
      { id: 'b', left: 'B', right: 'No', third: 'b3' },
      { id: 'c', left: 'C', right: 'Yes', third: 'c3' }, // shares "Yes" with a
    ],
  }
  const allRight = {
    a: 'Yes',
    b: 'No',
    c: 'Yes',
    [thirdKey('a')]: 'a',
    [thirdKey('b')]: 'b',
    [thirdKey('c')]: 'c',
  }

  it('grades a fixed column by value, so rows can share an answer', () => {
    expect(matchingDefinition.autoGrade!(fixed, allRight)?.correct).toBe(true)
    expect(
      matchingDefinition.autoGrade!(fixed, { ...allRight, a: 'No' })?.correct,
    ).toBe(false)
  })

  it('still grades the unique (third) column by pairing', () => {
    expect(
      matchingDefinition.autoGrade!(fixed, { ...allRight, [thirdKey('a')]: 'b' })
        ?.correct,
    ).toBe(false)
  })

  it('isComplete needs 2+ option values, each row picking from them', () => {
    expect(matchingDefinition.isComplete(fixed)).toBe(true)
    // a row value not in the option list
    expect(
      matchingDefinition.isComplete({
        ...fixed,
        pairs: [{ ...fixed.pairs[0], right: 'Maybe' }, ...fixed.pairs.slice(1)],
      }),
    ).toBe(false)
    // fewer than two option values
    expect(
      matchingDefinition.isComplete({ ...fixed, options: { right: ['Yes'] } }),
    ).toBe(false)
  })
})

describe('matching 3-part', () => {
  const allRight = {
    x: 'x',
    y: 'y',
    [thirdKey('x')]: 'x',
    [thirdKey('y')]: 'y',
  }

  it('grades both columns; both must belong to the row', () => {
    expect(matchingDefinition.autoGrade!(triple, allRight)?.correct).toBe(true)
    expect(
      matchingDefinition.autoGrade!(triple, { ...allRight, [thirdKey('x')]: 'y' })
        ?.correct,
    ).toBe(false)
  })

  it('a 2-part response ignores a wrong/absent third column', () => {
    expect(matchingDefinition.autoGrade!(content, allRight)?.correct).toBe(true)
  })

  it('isResponseReady requires both columns when triple', () => {
    expect(matchingDefinition.isResponseReady!({ x: 'x', y: 'y' }, triple)).toBe(
      false,
    )
    expect(matchingDefinition.isResponseReady!(allRight, triple)).toBe(true)
  })

  it('isComplete requires a third on every row when triple', () => {
    expect(matchingDefinition.isComplete(triple)).toBe(true)
    expect(
      matchingDefinition.isComplete({
        ...triple,
        pairs: [
          { id: 'x', left: 'A', right: 'a' }, // no third
          { id: 'y', left: 'B', right: 'b', third: 'b2' },
        ],
      }),
    ).toBe(false)
  })
})
