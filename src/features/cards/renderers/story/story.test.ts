import { describe, expect, it } from 'vitest'
import type { StoryContent } from '@/types'
import { storyDefinition } from './index'
import { isFinished } from './progress'

const content: StoryContent = {
  intro: 'Trace the construction order.',
  steps: [
    { id: 'a', prompt: 'What is built first?', answer: 'Base' },
    { id: 'b', prompt: 'Then what?', answer: 'Derived' },
  ],
}

const ready = (response: unknown) =>
  storyDefinition.isResponseReady!(response, content)

describe('story isResponseReady', () => {
  it('stays locked until the last step is revealed', () => {
    expect(ready(undefined)).toBe(false)
    expect(ready({ index: 0, revealed: true })).toBe(false)
    expect(ready({ index: 1, revealed: false })).toBe(false)
    expect(ready({ index: 1, revealed: true })).toBe(true)
  })

  it('a story with no steps is trivially ready', () => {
    expect(isFinished({ steps: [] }, undefined)).toBe(true)
  })
})

describe('story isComplete', () => {
  it('needs every step to have a prompt and answer', () => {
    expect(storyDefinition.isComplete(content)).toBe(true)
    expect(storyDefinition.isComplete({ ...content, steps: [] })).toBe(false)
    expect(
      storyDefinition.isComplete({
        ...content,
        steps: [{ id: 'a', prompt: 'q', answer: '' }],
      }),
    ).toBe(false)
  })
})

describe('story is self-graded', () => {
  it('has no autoGrade (one manual grade for the whole story)', () => {
    expect(storyDefinition.autoGrade).toBeUndefined()
  })
})
